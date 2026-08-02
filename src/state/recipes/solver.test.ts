import { describe, expect, it } from 'vitest';
import { SolverNode, SolverNodeKind, solveChain } from './solver';

type NodeSpec = {
  id: string;
  inputs?: { [productId: string]: number };
  outputs?: { [productId: string]: number };
  imports?: { [productId: string]: { source: string }[] };
  kind?: SolverNodeKind;
  pinned?: number | null;
};

const node = ({
  id,
  inputs = {},
  outputs = {},
  imports = {},
  kind = 'normal',
  pinned = null,
}: NodeSpec): SolverNode => ({
  id,
  recipeInputs: inputs,
  recipeOutputs: outputs,
  imports: Object.keys(imports).reduce(
    (acc, productId) => ({
      ...acc,
      [productId]: imports[productId].map((i) => ({ source: i.source })),
    }),
    {},
  ),
  kind,
  pinnedMachinesCount: pinned,
});

describe('solveChain', () => {
  it('sizes a single node from its target volume', () => {
    // A recipe producing 45 steel per 60s, asked for 100 per 60s.
    const nodes = [node({ id: 'smelter', inputs: { iron: 30 }, outputs: { steel: 45 } })];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'smelter', productId: 'steel', quantity: 100 },
    ]);

    expect(solved.smelter.machinesCount).toBeCloseTo(100 / 45, 6);
    expect(solved.smelter.outputRates.steel).toBeCloseTo(100, 6);
    expect(solved.smelter.inputRates.iron).toBeCloseTo(30 * (100 / 45), 6);
  });

  it('sizes an upstream supplier to meet derived demand', () => {
    const nodes = [
      node({
        id: 'smelter',
        inputs: { iron: 30 },
        outputs: { steel: 45 },
        imports: { iron: [{ source: 'foundry' }] },
      }),
      node({ id: 'foundry', inputs: { ore: 60 }, outputs: { iron: 20 } }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'smelter', productId: 'steel', quantity: 90 },
    ]);

    // 90 steel needs 2 smelters, which need 60 iron, which needs 3 foundries.
    expect(solved.smelter.machinesCount).toBeCloseTo(2, 6);
    expect(solved.foundry.machinesCount).toBeCloseTo(3, 6);
    expect(solved.foundry.outputRates.iron).toBeCloseTo(60, 6);
    expect(solved.smelter.importedRates.iron).toBeCloseTo(60, 6);
    expect(solved.foundry.exportedRates.iron).toBeCloseTo(60, 6);
  });

  it('sums demand on a merged supplier feeding two targets', () => {
    // One iron foundry supplying two independent consumers must be sized for
    // the combined draw, not just the first one processed.
    const nodes = [
      node({
        id: 'a',
        inputs: { iron: 20 },
        outputs: { plate: 10 },
        imports: { iron: [{ source: 'foundry' }] },
      }),
      node({
        id: 'b',
        inputs: { iron: 30 },
        outputs: { beam: 10 },
        imports: { iron: [{ source: 'foundry' }] },
      }),
      node({ id: 'foundry', outputs: { iron: 25 } }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'a', productId: 'plate', quantity: 10 },
      { nodeId: 'b', productId: 'beam', quantity: 10 },
    ]);

    // 20 + 30 = 50 iron, from a 25/60s recipe = 2 foundries.
    expect(solved.foundry.outputRates.iron).toBeCloseTo(50, 6);
    expect(solved.foundry.machinesCount).toBeCloseTo(2, 6);
  });

  it('sizes a shared supplier from combined demand through a diamond', () => {
    // root draws from both mid nodes, which both draw from base. Base must
    // see both mid demands even though one path reaches it first.
    const nodes = [
      node({
        id: 'root',
        inputs: { x: 10, y: 10 },
        outputs: { final: 10 },
        imports: { x: [{ source: 'midX' }], y: [{ source: 'midY' }] },
      }),
      node({
        id: 'midX',
        inputs: { base: 5 },
        outputs: { x: 10 },
        imports: { base: [{ source: 'base' }] },
      }),
      node({
        id: 'midY',
        inputs: { base: 7 },
        outputs: { y: 10 },
        imports: { base: [{ source: 'base' }] },
      }),
      node({ id: 'base', outputs: { base: 1 } }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'root', productId: 'final', quantity: 10 },
    ]);

    expect(solved.base.outputRates.base).toBeCloseTo(12, 6);
    expect(solved.base.machinesCount).toBeCloseTo(12, 6);
  });

  it('splits input demand evenly across two suppliers of the same product', () => {
    const nodes = [
      node({
        id: 'consumer',
        inputs: { iron: 100 },
        outputs: { plate: 50 },
        imports: { iron: [{ source: 'sourceA' }, { source: 'sourceB' }] },
      }),
      node({ id: 'sourceA', outputs: { iron: 10 } }),
      node({ id: 'sourceB', outputs: { iron: 10 } }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'consumer', productId: 'plate', quantity: 50 },
    ]);

    expect(solved.sourceA.outputRates.iron).toBeCloseTo(50, 6);
    expect(solved.sourceB.outputRates.iron).toBeCloseTo(50, 6);
    expect(solved.consumer.importedRates.iron).toBeCloseTo(100, 6);
    expect(solved.consumer.importFlows.iron).toHaveLength(2);
  });

  it('sizes a multi-output recipe from the driving output and reports the other as surplus', () => {
    // air_separation: no inputs, 36 oxygen + 36 nitrogen per 60s.
    const nodes = [node({ id: 'separator', outputs: { oxygen: 36, nitrogen: 36 } })];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'separator', productId: 'oxygen', quantity: 72 },
    ]);

    // Sized by oxygen; nitrogen comes out at the same scale, unasked for.
    expect(solved.separator.machinesCount).toBeCloseTo(2, 6);
    expect(solved.separator.outputRates.oxygen).toBeCloseTo(72, 6);
    expect(solved.separator.outputRates.nitrogen).toBeCloseTo(72, 6);
    expect(solved.separator.exportedRates.nitrogen ?? 0).toBe(0);
  });

  it('takes the binding output when two outputs are both in demand', () => {
    const nodes = [node({ id: 'separator', outputs: { oxygen: 36, nitrogen: 36 } })];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'separator', productId: 'oxygen', quantity: 36 },
      { nodeId: 'separator', productId: 'nitrogen', quantity: 108 },
    ]);

    // max(36/36, 108/36) = 3, not the sum.
    expect(solved.separator.machinesCount).toBeCloseTo(3, 6);
  });

  it('treats a mine with a zero-quantity output as an infinite source', () => {
    const nodes = [
      node({
        id: 'smelter',
        inputs: { iron_ore: 60 },
        outputs: { iron: 30 },
        imports: { iron_ore: [{ source: 'mine' }] },
      }),
      node({ id: 'mine', outputs: { iron_ore: 0 }, kind: 'infinite' }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'smelter', productId: 'iron', quantity: 60 },
    ]);

    expect(Number.isFinite(solved.mine.machinesCount)).toBe(true);
    expect(Number.isNaN(solved.mine.outputRates.iron_ore)).toBe(false);
    // The mine supplies exactly what is drawn from it.
    expect(solved.mine.outputRates.iron_ore).toBeCloseTo(120, 6);
    expect(solved.smelter.importedRates.iron_ore).toBeCloseTo(120, 6);
  });

  it('passes demand straight through a storage node, ignoring capacity', () => {
    // Storage recipes carry the same product in and out at buffer capacity
    // (6000), which is not a rate and must not scale anything.
    const nodes = [
      node({
        id: 'consumer',
        inputs: { acid: 50 },
        outputs: { product: 25 },
        imports: { acid: [{ source: 'storage' }] },
      }),
      node({
        id: 'storage',
        inputs: { acid: 6000 },
        outputs: { acid: 6000 },
        kind: 'passthrough',
        imports: { acid: [{ source: 'mixer' }] },
      }),
      node({ id: 'mixer', outputs: { acid: 72 } }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'consumer', productId: 'product', quantity: 25 },
    ]);

    expect(solved.storage.machinesCount).toBe(1);
    expect(solved.storage.outputRates.acid).toBeCloseTo(50, 6);
    expect(solved.storage.inputRates.acid).toBeCloseTo(50, 6);
    // Demand reaches the real producer undistorted by the 6000 capacity.
    expect(solved.mixer.outputRates.acid).toBeCloseTo(50, 6);
    expect(solved.mixer.machinesCount).toBeCloseTo(50 / 72, 6);
  });

  it('respects a pinned machinesCount and reports the resulting deficit', () => {
    const nodes = [
      node({
        id: 'smelter',
        inputs: { iron: 30 },
        outputs: { steel: 45 },
        imports: { iron: [{ source: 'foundry' }] },
      }),
      node({ id: 'foundry', outputs: { iron: 20 }, pinned: 1 }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'smelter', productId: 'steel', quantity: 90 },
    ]);

    // The smelter needs 60 iron but the pinned foundry only makes 20.
    expect(solved.foundry.machinesCount).toBe(1);
    expect(solved.foundry.outputRates.iron).toBeCloseTo(20, 6);
    expect(solved.smelter.inputRates.iron).toBeCloseTo(60, 6);
    // The draw is capped at what the foundry can actually make, so the 40/60s
    // shortfall stays visible on the smelter's input rather than being papered
    // over by an export flow the supplier could never deliver.
    expect(solved.foundry.exportedRates.iron).toBeCloseTo(20, 6);
    expect(solved.smelter.importedRates.iron).toBeCloseTo(20, 6);
    expect(solved.smelter.inputRates.iron - solved.smelter.importedRates.iron).toBeCloseTo(40, 6);
  });

  it('caps the draw on a pinned supplier and leaves the rest as a shortfall', () => {
    // The consumer needs 100 iron but the supplier is pinned to a single
    // building making 10. The shortfall must stay visible.
    const nodes = [
      node({
        id: 'consumer',
        inputs: { iron: 100 },
        outputs: { plate: 50 },
        imports: { iron: [{ source: 'supplier' }] },
      }),
      node({ id: 'supplier', outputs: { iron: 10 }, pinned: 1 }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'consumer', productId: 'plate', quantity: 50 },
    ]);

    expect(solved.supplier.outputRates.iron).toBeCloseTo(10, 6);
    expect(solved.consumer.importedRates.iron).toBeCloseTo(10, 6);
    // Not silently reported as fully supplied.
    expect(solved.consumer.importedRates.iron).toBeLessThan(solved.consumer.inputRates.iron);
  });

  it('shifts demand a pinned supplier cannot cover onto one that can grow', () => {
    const nodes = [
      node({
        id: 'consumer',
        inputs: { iron: 100 },
        outputs: { plate: 50 },
        imports: { iron: [{ source: 'pinned' }, { source: 'flexible' }] },
      }),
      node({ id: 'pinned', outputs: { iron: 10 }, pinned: 1 }),
      node({ id: 'flexible', outputs: { iron: 10 } }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'consumer', productId: 'plate', quantity: 50 },
    ]);

    // Pinned covers 10 of its 50 share; the flexible supplier absorbs the rest.
    expect(solved.pinned.outputRates.iron).toBeCloseTo(10, 6);
    expect(solved.flexible.outputRates.iron).toBeCloseTo(90, 6);
    expect(solved.consumer.importedRates.iron).toBeCloseTo(100, 6);
  });

  it('fills demand from a pinned supplier with spare capacity before reporting a shortfall', () => {
    // Even split would give each 50, capping the second at 0 and calling the
    // remaining 50 a deficit — even though the first can cover all of it.
    const nodes = [
      node({
        id: 'consumer',
        inputs: { iron: 100 },
        outputs: { plate: 50 },
        imports: { iron: [{ source: 'big' }, { source: 'empty' }] },
      }),
      node({ id: 'big', outputs: { iron: 100 }, pinned: 1 }),
      node({ id: 'empty', outputs: { iron: 0 }, pinned: 1 }),
    ];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'consumer', productId: 'plate', quantity: 50 },
    ]);

    expect(solved.consumer.importedRates.iron).toBeCloseTo(100, 6);
    expect(solved.big.outputRates.iron).toBeCloseTo(100, 6);
  });

  it('counts a target as consuming its node output', () => {
    const nodes = [node({ id: 'root', outputs: { steel: 45 } })];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'root', productId: 'steel', quantity: 45 },
    ]);

    // Without this a root node reports its entire output as unused.
    expect(solved.root.exportedRates.steel).toBeCloseTo(45, 6);
  });

  it('sums two targets drawing on the same node', () => {
    const nodes = [node({ id: 'root', outputs: { steel: 45 }, pinned: 1 })];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'root', productId: 'steel', quantity: 8 },
      { nodeId: 'root', productId: 'steel', quantity: 8 },
    ]);

    expect(solved.root.exportedRates.steel).toBeCloseTo(16, 6);
  });

  it('terminates on a cyclic supplier graph without diverging', () => {
    // A water loop: the electrolyser needs water, and the condenser that
    // supplies it needs steam from the electrolyser.
    const nodes = [
      node({
        id: 'electrolyser',
        inputs: { water: 100 },
        outputs: { hydrogen: 50, steam: 20 },
        imports: { water: [{ source: 'condenser' }] },
      }),
      node({
        id: 'condenser',
        inputs: { steam: 20 },
        outputs: { water: 100 },
        imports: { steam: [{ source: 'electrolyser' }] },
      }),
    ];
    const { nodes: solved, brokenEdges } = solveChain(nodes, [
      { nodeId: 'electrolyser', productId: 'hydrogen', quantity: 100 },
    ]);

    expect(brokenEdges.length).toBeGreaterThan(0);
    expect(Number.isFinite(solved.electrolyser.machinesCount)).toBe(true);
    expect(Number.isFinite(solved.condenser.machinesCount)).toBe(true);
    expect(solved.electrolyser.machinesCount).toBeCloseTo(2, 6);
    expect(solved.condenser.machinesCount).toBeCloseTo(2, 6);
  });

  it('reports an unsupplied input as a raw-input deficit', () => {
    const nodes = [node({ id: 'smelter', inputs: { iron: 30 }, outputs: { steel: 45 } })];
    const { nodes: solved } = solveChain(nodes, [
      { nodeId: 'smelter', productId: 'steel', quantity: 45 },
    ]);

    expect(solved.smelter.inputRates.iron).toBeCloseTo(30, 6);
    expect(solved.smelter.importedRates.iron).toBe(0);
    expect(solved.smelter.importFlows.iron).toEqual([]);
  });

  it('leaves a node with no demand at a single building', () => {
    const nodes = [node({ id: 'orphan', inputs: { iron: 30 }, outputs: { steel: 45 } })];
    const { nodes: solved } = solveChain(nodes, []);

    expect(solved.orphan.machinesCount).toBe(1);
    expect(solved.orphan.outputRates.steel).toBeCloseTo(45, 6);
  });
});
