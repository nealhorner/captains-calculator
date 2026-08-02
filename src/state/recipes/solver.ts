import { EPSILON } from 'utils/numbers';

/**
 * Production chain solver.
 *
 * Every recipe in the game data has a duration of 60 seconds, so a recipe's
 * `quantity` is already a per-60-second rate. A node's throughput is therefore
 * just `quantity * machinesCount`, and sizing the chain means picking a
 * `machinesCount` for every node such that the user's target volumes are met.
 *
 * This module is deliberately free of any Overmind imports so it can be unit
 * tested against plain objects.
 */

export type SolverNodeKind =
  /** A regular production building. Sized from the demand on its outputs. */
  | 'normal'
  /** A mine or other well with a zero-quantity output. Supplies whatever is asked of it. */
  | 'infinite'
  /** Storage. Its quantity is buffer capacity, not a rate, so demand passes straight through. */
  | 'passthrough';

export type SolverNode = {
  id: string;
  /** Raw per-machine input quantities, keyed by product id. */
  recipeInputs: { [productId: string]: number };
  /** Raw per-machine output quantities, keyed by product id. */
  recipeOutputs: { [productId: string]: number };
  /**
   * Link topology only — which nodes supply each input product. Demand is
   * split evenly between them.
   */
  imports: { [productId: string]: { source: string }[] };
  kind: SolverNodeKind;
  /** When the user has typed a count by hand, it wins over the derived one. */
  pinnedMachinesCount: number | null;
};

export type SolverDemand = {
  nodeId: string;
  productId: string;
  quantity: number;
};

export type SolverNodeSolution = {
  machinesCount: number;
  /** Per-product output rate the node actually produces, per 60s. */
  outputRates: { [productId: string]: number };
  /** Per-product rate the node needs on its inputs, per 60s. */
  inputRates: { [productId: string]: number };
  /** How much of each output is drawn by downstream consumers. */
  exportedRates: { [productId: string]: number };
  /** How much of each input is actually supplied by linked sources. */
  importedRates: { [productId: string]: number };
  /** Resolved per-link flows, so each edge can be labelled. */
  importFlows: { [productId: string]: { source: string; quantity: number }[] };
};

export type SolverResult = {
  nodes: { [nodeId: string]: SolverNodeSolution };
  /**
   * Supplier links that were skipped to break a cycle, as `${consumerId}->${sourceId}:${productId}`.
   * Their flow is still reported on the edge, it is just not propagated upstream.
   */
  brokenEdges: string[];
};

const emptySolution = (): SolverNodeSolution => ({
  machinesCount: 0,
  outputRates: {},
  inputRates: {},
  exportedRates: {},
  importedRates: {},
  importFlows: {},
});

/**
 * Finds the supplier links that have to be ignored for a cycle to be solvable.
 * Walks the supplier direction depth first; a node already on the current path
 * is a back edge.
 */
const findBackEdges = (nodes: SolverNode[], roots: string[]): Set<string> => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const finished = new Set<string>();
  const onPath = new Set<string>();
  const brokenEdges = new Set<string>();

  const visit = (nodeId: string) => {
    const node = byId.get(nodeId);
    if (!node || finished.has(nodeId)) return;

    onPath.add(nodeId);

    Object.keys(node.imports).forEach((productId) => {
      node.imports[productId].forEach(({ source }) => {
        if (onPath.has(source)) {
          brokenEdges.add(`${nodeId}->${source}:${productId}`);
          return;
        }
        visit(source);
      });
    });

    onPath.delete(nodeId);
    finished.add(nodeId);
  };

  // Roots first, so back edges are identified relative to the direction demand
  // actually flows.
  roots.forEach(visit);
  nodes.forEach((node) => visit(node.id));

  return brokenEdges;
};

/**
 * Orders nodes so that a node is only sized once every one of its consumers has
 * been sized — otherwise a supplier shared by two consumers would be sized from
 * just the first one's demand. This is a topological sort of the
 * consumer -> supplier graph (Kahn), with cycles broken beforehand so it always
 * drains.
 */
const orderConsumersFirst = (
  nodes: SolverNode[],
  roots: string[],
): { order: string[]; brokenEdges: Set<string> } => {
  const brokenEdges = findBackEdges(nodes, roots);
  const ids = nodes.map((node) => node.id);
  const known = new Set(ids);

  // For each supplier, the set of nodes drawing from it.
  const consumersOf = new Map<string, Set<string>>();
  // For each consumer, the set of nodes it draws from.
  const suppliersOf = new Map<string, Set<string>>();

  ids.forEach((id) => {
    consumersOf.set(id, new Set());
    suppliersOf.set(id, new Set());
  });

  nodes.forEach((node) => {
    Object.keys(node.imports).forEach((productId) => {
      node.imports[productId].forEach(({ source }) => {
        if (!known.has(source) || source === node.id) return;
        if (brokenEdges.has(`${node.id}->${source}:${productId}`)) return;
        consumersOf.get(source)!.add(node.id);
        suppliersOf.get(node.id)!.add(source);
      });
    });
  });

  const remaining = new Map(ids.map((id) => [id, consumersOf.get(id)!.size]));

  // Seed with the nodes nothing draws from: the targets and any dead ends.
  // Roots go first so demand is placed before anything else is sized.
  const queue = [
    ...roots.filter((id) => known.has(id) && remaining.get(id) === 0),
    ...ids.filter((id) => remaining.get(id) === 0 && !roots.includes(id)),
  ];

  const order: string[] = [];
  const emitted = new Set<string>();

  const emit = (id: string) => {
    if (emitted.has(id)) return;
    emitted.add(id);
    order.push(id);
    suppliersOf.get(id)!.forEach((source) => {
      const left = (remaining.get(source) ?? 0) - 1;
      remaining.set(source, left);
      if (left <= 0) queue.push(source);
    });
  };

  while (queue.length) {
    emit(queue.shift()!);
  }

  // Defensive: anything still held up by a cycle we failed to break is emitted
  // in declaration order rather than dropped.
  ids.forEach(emit);

  return { order, brokenEdges };
};

export const solveChain = (nodes: SolverNode[], demands: SolverDemand[]): SolverResult => {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  // 1. Seed demand from the targets. Summing here is what makes a supplier
  //    shared between two targets size itself for their combined draw.
  const demand = new Map<string, Map<string, number>>();

  const addDemand = (nodeId: string, productId: string, quantity: number) => {
    if (!byId.has(nodeId) || quantity <= 0) return;
    let forNode = demand.get(nodeId);
    if (!forNode) {
      forNode = new Map();
      demand.set(nodeId, forNode);
    }
    forNode.set(productId, (forNode.get(productId) ?? 0) + quantity);
  };

  demands.forEach(({ nodeId, productId, quantity }) => addDemand(nodeId, productId, quantity));

  /**
   * How much of a product a supplier can still be asked for.
   *
   * Only a pinned building is genuinely capped — every other node is sized from
   * the demand placed on it, so it grows to meet whatever it is asked for and
   * has no ceiling. `null` means unbounded.
   */
  const capacityLeft = new Map<string, Map<string, number>>();

  const remainingCapacity = (nodeId: string, productId: string): number | null => {
    const node = byId.get(nodeId);
    if (!node) return 0;
    if (node.kind !== 'normal' || node.pinnedMachinesCount === null) return null;

    let forNode = capacityLeft.get(nodeId);
    if (!forNode) {
      forNode = new Map();
      capacityLeft.set(nodeId, forNode);
    }
    if (!forNode.has(productId)) {
      const perMachine = node.recipeOutputs[productId] ?? 0;
      forNode.set(productId, Math.max(0, perMachine * node.pinnedMachinesCount));
    }
    return forNode.get(productId)!;
  };

  const consumeCapacity = (nodeId: string, productId: string, amount: number) => {
    const forNode = capacityLeft.get(nodeId);
    if (!forNode || !forNode.has(productId)) return;
    forNode.set(productId, Math.max(0, forNode.get(productId)! - amount));
  };

  // 2. Order the nodes, consumers before suppliers.
  const roots = demands.map((d) => d.nodeId).filter((id) => byId.has(id));
  const { order, brokenEdges } = orderConsumersFirst(nodes, roots);

  const solutions: { [nodeId: string]: SolverNodeSolution } = {};
  nodes.forEach((node) => {
    solutions[node.id] = emptySolution();
  });

  // 3 & 4. Size each node from the demand placed on it, then push its input
  //        demand back onto its suppliers.
  order.forEach((nodeId) => {
    const node = byId.get(nodeId);
    if (!node) return;

    const solution = solutions[nodeId];
    const required = demand.get(nodeId) ?? new Map<string, number>();
    const outputIds = Object.keys(node.recipeOutputs);
    const inputIds = Object.keys(node.recipeInputs);

    if (node.kind === 'infinite') {
      // A mine supplies exactly what is asked of it. Its output quantity is
      // zero in the data, so there is nothing to divide by.
      solution.machinesCount = node.pinnedMachinesCount ?? 1;
      outputIds.forEach((productId) => {
        solution.outputRates[productId] = required.get(productId) ?? 0;
      });
    } else if (node.kind === 'passthrough') {
      // Storage moves product without transforming it: whatever is drawn
      // from an output must be fed into the matching input.
      solution.machinesCount = node.pinnedMachinesCount ?? 1;
      outputIds.forEach((productId) => {
        solution.outputRates[productId] = required.get(productId) ?? 0;
      });
      inputIds.forEach((productId) => {
        solution.inputRates[productId] = required.get(productId) ?? 0;
      });
    } else {
      if (node.pinnedMachinesCount !== null) {
        solution.machinesCount = node.pinnedMachinesCount;
      } else {
        // One recipe run yields every output at once, so the binding
        // output sets the count and the rest come out as surplus.
        let derived = 0;
        required.forEach((quantity, productId) => {
          const perMachine = node.recipeOutputs[productId];
          if (perMachine === undefined || perMachine <= 0) return;
          derived = Math.max(derived, quantity / perMachine);
        });
        // A node nothing depends on yet still shows as a single building.
        solution.machinesCount = derived > 0 ? derived : 1;
      }

      outputIds.forEach((productId) => {
        solution.outputRates[productId] = node.recipeOutputs[productId] * solution.machinesCount;
      });
      inputIds.forEach((productId) => {
        solution.inputRates[productId] = node.recipeInputs[productId] * solution.machinesCount;
      });
    }

    // Split each input's demand across its linked suppliers, evenly but never
    // beyond what a supplier can actually make.
    inputIds.forEach((productId) => {
      const suppliers = node.imports[productId] ?? [];
      const needed = solution.inputRates[productId] ?? 0;

      solution.importFlows[productId] = [];
      solution.importedRates[productId] = 0;

      if (!suppliers.length || needed <= 0) return;

      const evenShare = needed / suppliers.length;
      const allocations: { source: string; quantity: number }[] = [];
      const unbounded: string[] = [];
      let unallocated = 0;

      suppliers.forEach(({ source }) => {
        const capacity = remainingCapacity(source, productId);
        if (capacity === null) {
          // Sized from demand, so it will make whatever is asked of it.
          unbounded.push(source);
          allocations.push({ source, quantity: evenShare });
          return;
        }
        const taken = Math.min(evenShare, capacity);
        consumeCapacity(source, productId, taken);
        unallocated += evenShare - taken;
        allocations.push({ source, quantity: taken });
      });

      // Anything a capped supplier could not cover is offered around: first to
      // capped suppliers that still have room, then to the ones that can grow
      // without limit. Whatever nobody can take is a genuine shortfall.
      if (unallocated > EPSILON) {
        allocations.forEach((allocation) => {
          if (unallocated <= EPSILON) return;
          if (unbounded.includes(allocation.source)) return;
          const spare = remainingCapacity(allocation.source, productId);
          if (spare === null || spare <= 0) return;
          const taken = Math.min(unallocated, spare);
          consumeCapacity(allocation.source, productId, taken);
          allocation.quantity += taken;
          unallocated -= taken;
        });
      }

      if (unallocated > EPSILON && unbounded.length) {
        const extra = unallocated / unbounded.length;
        allocations.forEach((allocation) => {
          if (unbounded.includes(allocation.source)) allocation.quantity += extra;
        });
        unallocated = 0;
      }

      allocations.forEach(({ source, quantity }) => {
        if (quantity <= 0) return;

        solution.importFlows[productId].push({ source, quantity });
        solution.importedRates[productId] += quantity;

        // A back edge's flow is reported but not propagated, so a cycle
        // cannot feed itself and diverge.
        if (brokenEdges.has(`${nodeId}->${source}:${productId}`)) return;

        addDemand(source, productId, quantity);
      });
    });
  });

  // 5a. A target is a consumer too. Counting its demand here stops every root
  //     node reporting its entire output as unused, and lets a node shared by
  //     several targets show their combined draw.
  demands.forEach(({ nodeId, productId, quantity }) => {
    const solution = solutions[nodeId];
    if (!solution || quantity <= 0) return;
    solution.exportedRates[productId] = (solution.exportedRates[productId] ?? 0) + quantity;
  });

  // 5. Roll each node's draw on its suppliers back up as their exported rate.
  order.forEach((nodeId) => {
    const solution = solutions[nodeId];
    Object.keys(solution.importFlows).forEach((productId) => {
      solution.importFlows[productId].forEach(({ source, quantity }) => {
        const supplier = solutions[source];
        if (!supplier) return;
        supplier.exportedRates[productId] = (supplier.exportedRates[productId] ?? 0) + quantity;
      });
    });
  });

  // An infinite or pass-through node's output rate is defined by what is drawn
  // from it, which is only fully known once every consumer has been sized.
  nodes.forEach((node) => {
    if (node.kind !== 'infinite' && node.kind !== 'passthrough') return;
    const solution = solutions[node.id];
    Object.keys(node.recipeOutputs).forEach((productId) => {
      const drawn = solution.exportedRates[productId] ?? 0;
      solution.outputRates[productId] = Math.max(solution.outputRates[productId] ?? 0, drawn);
    });
    if (node.kind === 'passthrough') {
      Object.keys(node.recipeInputs).forEach((productId) => {
        solution.inputRates[productId] = Math.max(
          solution.inputRates[productId] ?? 0,
          solution.outputRates[productId] ?? 0,
        );
      });
    }
  });

  return { nodes: solutions, brokenEdges: Array.from(brokenEdges) };
};

/** True when `supplied` covers `needed`, tolerant of accumulated float error. */
export const meetsRate = (supplied: number, needed: number): boolean => {
  // Relative, not absolute: rates run into the thousands several levels down a
  // chain, and the float error from splitting and scaling grows with them, so a
  // fixed 1e-6 would report a perfectly balanced chain as unsatisfied.
  return supplied >= needed - EPSILON * Math.max(1, Math.abs(needed));
};
