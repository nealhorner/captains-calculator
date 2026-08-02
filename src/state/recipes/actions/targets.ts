import { Action, AsyncAction, ChainTarget } from 'state/_types';
import { MachineId, ProductId, RecipeId } from 'state/app/effects/loadJsonData';
import { RecipeIOExportProduct, RecipeIOImportProduct } from '../ProductionNode';
import { dictValues } from 'utils/objects';
import { RecipeProduct } from 'state/app/effects/loadJsonData';

let targetSequence = 0;

/**
 * Keeps the target id counter ahead of anything restored from a file or
 * localStorage. Without this a restored `target_1` would be silently
 * overwritten by the next target the user adds, taking its chain with it.
 */
export const reserveTargetId = (id: string): void => {
  const suffix = Number(id.slice(id.lastIndexOf('_') + 1));
  if (Number.isFinite(suffix) && suffix > targetSequence) targetSequence = suffix;
};

/**
 * Starts a new, empty target and makes it the one the setup drawers are editing.
 * The product, building and recipe are filled in as the user picks them.
 */
export const createTarget: Action<void, string> = ({ state }) => {
  let target: ChainTarget = {
    id: `target_${++targetSequence}`,
    productId: null,
    machineId: null,
    recipeId: null,
    quantity: 0,
    nodeId: null,
  };

  state.recipes.targets[target.id] = target;
  state.recipes.activeTargetId = target.id;

  return target.id;
};

export const setActiveTarget: Action<string | null> = ({ state }, targetId) => {
  state.recipes.activeTargetId = targetId;
};

/** Choosing a product invalidates the building and recipe below it. */
export const setTargetProduct: AsyncAction<ProductId> = async ({ state, actions }, productId) => {
  let target = state.recipes.activeTarget;
  if (!target) return;

  let previousNodeId = target.nodeId;

  target.productId = productId;
  target.machineId = null;
  target.recipeId = null;
  target.nodeId = null;
  target.quantity = 0;

  if (previousNodeId) actions.recipes.releaseTargetNode();
};

export const setTargetMachine: AsyncAction<MachineId> = async ({ state, actions }, machineId) => {
  let target = state.recipes.activeTarget;
  if (!target) return;

  let previousNodeId = target.nodeId;

  target.machineId = machineId;
  target.recipeId = null;
  target.nodeId = null;
  target.quantity = 0;

  if (previousNodeId) actions.recipes.releaseTargetNode();
};

/**
 * Choosing the recipe is what actually seeds the graph. An existing node for the
 * same recipe is reused, so a second target producing something already in the
 * chain adds demand rather than a duplicate building.
 *
 * The volume defaults to the recipe's own output quantity, i.e. exactly one
 * building, which is the natural starting point.
 */
export const setTargetRecipe: AsyncAction<RecipeId> = async ({ state, actions }, recipeId) => {
  let target = state.recipes.activeTarget;
  if (!target) return;

  let recipe = state.recipes.items[recipeId];
  if (!recipe) return;

  let previousNodeId = target.nodeId;

  // Fall back to the recipe's first output if the flow somehow has no product.
  let productId = target.productId ?? recipe.outputs[0]?.id ?? null;
  let output = productId
    ? recipe.outputs.find((o: RecipeProduct) => o.id === productId)
    : undefined;

  target.recipeId = recipeId;
  target.productId = productId;
  target.machineId = recipe.machine;
  target.quantity = output ? output.quantity : 0;

  let reusable = actions.recipes.findReusableNode({ recipeId });
  target.nodeId = reusable ?? actions.recipes.createProductionNode({ recipeId }).id;

  if (previousNodeId && previousNodeId !== target.nodeId) {
    // Prune directly rather than via releaseTargetNode, which would solve and
    // persist a second time on top of the recalculate below.
    actions.recipes.pruneOrphanNodes();
  }

  actions.recipes.recalculate();
};

export const setTargetQuantity: Action<{ targetId: string; quantity: number }> = (
  { state, actions },
  { targetId, quantity },
) => {
  let target = state.recipes.targets[targetId];
  if (!target) return;

  target.quantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

  actions.recipes.recalculate();
};

export const removeTarget: Action<string> = ({ state, actions }, targetId) => {
  let target = state.recipes.targets[targetId];
  if (!target) return;

  let nodeId = target.nodeId;

  // Rebuild rather than `delete`: Overmind does not reliably notify components
  // tracking the dictionary when a key is deleted, so the setup bar would keep
  // rendering a card for a target that no longer exists.
  let remaining: { [key: string]: ChainTarget } = {};
  Object.keys(state.recipes.targets).forEach((id) => {
    if (id !== targetId) remaining[id] = state.recipes.targets[id];
  });
  state.recipes.targets = remaining;

  if (state.recipes.activeTargetId === targetId) {
    state.recipes.activeTargetId = null;
  }

  if (nodeId) actions.recipes.pruneOrphanNodes();

  actions.recipes.recalculate();
};

/**
 * Drops any node no target points at any more, and re-sizes what is left. Called
 * when the user changes their mind partway through the setup flow.
 *
 * Takes no node id: pruning is reachability-based over the whole graph, so the
 * node that was just released is found the same way as any other orphan.
 */
export const releaseTargetNode: Action = ({ actions }) => {
  actions.recipes.pruneOrphanNodes();
  actions.recipes.recalculate();
};

/**
 * Removes nodes that no target can reach. A node supplying a chain that is still
 * targeted survives; one left behind by a deleted target does not.
 */
export const pruneOrphanNodes: Action = ({ state }) => {
  let reachable = new Set<string>();
  let queue: string[] = [];

  dictValues<ChainTarget>(state.recipes.targets).forEach((target) => {
    if (target.nodeId && state.recipes.nodes[target.nodeId] && !reachable.has(target.nodeId)) {
      reachable.add(target.nodeId);
      queue.push(target.nodeId);
    }
  });

  // Walk both directions: a target's chain includes its suppliers and anything
  // it feeds, since the user linked those deliberately.
  while (queue.length) {
    let nodeId = queue.shift()!;
    let node = state.recipes.nodes[nodeId];
    if (!node) continue;
    let neighbours: string[] = [];
    dictValues<RecipeIOImportProduct>(node.inputs).forEach((input) => {
      input.imports.forEach(({ source }: { source: string }) => neighbours.push(source));
    });
    dictValues<RecipeIOExportProduct>(node.outputs).forEach((output) => {
      output.exports.forEach(({ target }: { target: string }) => neighbours.push(target));
    });
    neighbours.forEach((id) => {
      if (reachable.has(id) || !state.recipes.nodes[id]) return;
      reachable.add(id);
      queue.push(id);
    });
  }

  let orphans = Object.keys(state.recipes.nodes).filter((id) => !reachable.has(id));
  if (!orphans.length) return;

  // No need to strip links to the orphans first: the walk above follows imports
  // and exports alike, so anything linked to a surviving node is itself
  // reachable. An orphan can only be linked to another orphan, and both go.
  let remaining: typeof state.recipes.nodes = {};
  Object.keys(state.recipes.nodes).forEach((id) => {
    if (reachable.has(id)) remaining[id] = state.recipes.nodes[id];
  });

  state.recipes.nodes = remaining;
};

/** Pins a node's building count by hand, or clears the pin with `null`. */
export const setNodeMachinesCount: Action<{ nodeId: string; count: number | null }> = (
  { state, actions },
  { nodeId, count },
) => {
  let node = state.recipes.nodes[nodeId];
  if (!node) return;

  node.pinnedMachinesCount = count !== null && Number.isFinite(count) && count >= 0 ? count : null;

  actions.recipes.recalculate();
};
