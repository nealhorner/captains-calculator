import { describe, it, expect } from 'vitest';

import { buildTestWorld, makeChainTarget } from '../testFixtures';
import { buildTestContext } from '../testContext';
import { EXPORT_FORMAT, EXPORT_FORMAT_VERSION } from '../importExport';

const setup = () => buildTestContext(buildTestWorld());

/** A two-node chain with a target, then exported. */
const buildAndExport = async () => {
  const ctx = setup();
  const caster = ctx.actions.createProductionNode({ recipeId: 'cast_steel' });

  await ctx.actions.linkRecipe({
    currentNodeId: caster.id,
    newNodeId: 'smelt_steel',
    productId: 'molten_steel',
    direction: 'input',
  });

  ctx.state.recipes.targets['t1'] = makeChainTarget({
    id: 't1',
    productId: 'steel',
    machineId: 'caster',
    recipeId: 'cast_steel',
    quantity: 36,
    nodeId: caster.id,
  });
  ctx.actions.recalculate();

  return { file: ctx.actions.exportGraph(), casterId: caster.id };
};

describe('importGraph', () => {
  it('rejects a file that is not an export', () => {
    const { actions, state } = setup();
    actions.createProductionNode({ recipeId: 'cast_steel' });

    const result = actions.importGraph({ nope: true });

    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    // The existing chain is left alone.
    expect(Object.keys(state.recipes.nodes)).toHaveLength(1);
  });

  it('round-trips a chain, restoring nodes, links and targets', async () => {
    const { file, casterId } = await buildAndExport();
    const { actions, state } = setup();

    const result = actions.importGraph(file);

    expect(result.imported).toBe(2);
    expect(result.errors).toEqual([]);
    expect(Object.keys(state.recipes.nodes)).toHaveLength(2);
    expect(Object.keys(state.recipes.targets)).toHaveLength(1);

    const caster = state.recipes.nodes[casterId];
    expect(caster.inputs['molten_steel'].imports).toHaveLength(1);
  });

  it('re-solves an imported chain so it arrives correctly sized', async () => {
    const { file, casterId } = await buildAndExport();
    const { actions, state } = setup();

    actions.importGraph(file);

    const caster = state.recipes.nodes[casterId];
    const smelter = Object.values(state.recipes.nodes).find((n) => n.id !== casterId)!;

    // 36 steel needs 3 casters, needing 36 molten steel, needing 3 smelters.
    expect(caster.machinesCount).toBeCloseTo(3, 6);
    expect(smelter.machinesCount).toBeCloseTo(3, 6);
    expect(caster.inputs['molten_steel'].satisfied).toBe(true);
  });

  it('keeps a pinned building count across a round trip', async () => {
    const ctx = setup();
    const caster = ctx.actions.createProductionNode({ recipeId: 'cast_steel' });
    ctx.actions.setNodeMachinesCount({ nodeId: caster.id, count: 4 });

    const file = ctx.actions.exportGraph();

    const fresh = setup();
    fresh.actions.importGraph(file);

    expect(fresh.state.recipes.nodes[caster.id].pinnedMachinesCount).toBe(4);
    expect(fresh.state.recipes.nodes[caster.id].machinesCount).toBe(4);
  });

  it('skips a node whose recipe no longer exists and drops links to it', async () => {
    const { file } = await buildAndExport();
    const smelterNode = file.nodes.find((n: { recipeId: string }) => n.recipeId === 'smelt_steel')!;
    smelterNode.recipeId = 'recipe_that_was_removed' as any;

    const { actions, state } = setup();
    const result = actions.importGraph(file);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors.join(' ')).toContain('no longer exists');

    const caster = Object.values(state.recipes.nodes)[0];
    // The dangling link to the dropped smelter is gone, leaving a raw input.
    expect(caster.inputs['molten_steel'].imports).toEqual([]);
    expect(caster.inputs['molten_steel'].deficit).toBeGreaterThan(0);
  });

  it('drops a target whose node could not be restored', async () => {
    const { file } = await buildAndExport();
    file.nodes = file.nodes.filter((n: { recipeId: string }) => n.recipeId !== 'cast_steel');

    const { actions, state } = setup();
    const result = actions.importGraph(file);

    expect(Object.keys(state.recipes.targets)).toHaveLength(0);
    expect(result.errors.join(' ')).toContain('target');
  });

  it('leaves the current chain untouched when nothing can be imported', () => {
    const { actions, state } = setup();
    actions.createProductionNode({ recipeId: 'cast_steel' });

    const result = actions.importGraph({
      format: EXPORT_FORMAT,
      version: EXPORT_FORMAT_VERSION,
      exportedAt: '',
      nodes: [{ id: 'x', recipeId: 'gone', pinnedMachinesCount: null, imports: {} }],
      targets: [],
    });

    expect(result.imported).toBe(0);
    expect(Object.keys(state.recipes.nodes)).toHaveLength(1);
  });

  it('does not let a newly added target overwrite a restored one', async () => {
    const { file } = await buildAndExport();
    const { actions, state } = setup();

    actions.importGraph(file);
    const restoredId = Object.keys(state.recipes.targets)[0];

    // The id counter must resume past what was restored.
    actions.createTarget();

    expect(Object.keys(state.recipes.targets)).toHaveLength(2);
    expect(state.recipes.targets[restoredId]).toBeDefined();
    expect(state.recipes.targets[restoredId].nodeId).not.toBeNull();
  });

  it('rejects a file carrying a NaN or negative quantity', async () => {
    const { file } = await buildAndExport();
    const { actions } = setup();

    expect(
      actions.importGraph({ ...file, targets: [{ ...file.targets[0], quantity: NaN }] }).imported,
    ).toBe(0);
    expect(
      actions.importGraph({ ...file, targets: [{ ...file.targets[0], quantity: -5 }] }).imported,
    ).toBe(0);
    expect(
      actions.importGraph({
        ...file,
        nodes: file.nodes.map((n: any) => ({ ...n, pinnedMachinesCount: Infinity })),
      }).imported,
    ).toBe(0);
  });
});
