import { describe, it, expect } from 'vitest';

import { buildTestWorld } from './testFixtures';
import { buildTestContext } from './testContext';
import { isExportedGraph, EXPORT_FORMAT, EXPORT_FORMAT_VERSION } from './importExport';

const setup = () => buildTestContext(buildTestWorld());

/** Builds a two-node chain with a target, the shape a user would actually save. */
const buildChain = async () => {
  const ctx = setup();
  const caster = ctx.actions.createProductionNode({ recipeId: 'cast_steel' });

  await ctx.actions.linkRecipe({
    currentNodeId: caster.id,
    newNodeId: 'smelt_steel',
    productId: 'molten_steel',
    direction: 'input',
  });

  ctx.state.recipes.targets['t1'] = {
    id: 't1',
    productId: 'steel' as any,
    machineId: 'caster' as any,
    recipeId: 'cast_steel' as any,
    quantity: 36,
    nodeId: caster.id,
  };
  ctx.actions.recalculate();

  return { ...ctx, caster };
};

describe('graph export', () => {
  it('writes a recognisable, self-describing file', async () => {
    const { actions } = await buildChain();
    const graph = actions.exportGraph();

    expect(graph.format).toBe(EXPORT_FORMAT);
    expect(graph.version).toBe(EXPORT_FORMAT_VERSION);
    expect(isExportedGraph(graph)).toBe(true);
  });

  it('stores the targets, not just the nodes', async () => {
    const { actions } = await buildChain();
    const graph = actions.exportGraph();

    expect(graph.nodes).toHaveLength(2);
    expect(graph.targets).toHaveLength(1);
    expect(graph.targets[0]).toMatchObject({ productId: 'steel', quantity: 36 });
  });

  it('stores only what the user chose, leaving derived rates out', async () => {
    const { actions } = await buildChain();
    const [node] = actions.exportGraph().nodes;

    expect(Object.keys(node).sort()).toEqual(['id', 'imports', 'pinnedMachinesCount', 'recipeId']);
  });

  it('omits a half-finished target that has no node yet', async () => {
    const { state, actions } = await buildChain();
    state.recipes.targets['draft'] = {
      id: 'draft',
      productId: null,
      machineId: null,
      recipeId: null,
      quantity: 0,
      nodeId: null,
    };

    expect(actions.exportGraph().targets).toHaveLength(1);
  });
});

describe('isExportedGraph', () => {
  it('rejects data that is not an export file', () => {
    expect(isExportedGraph(null)).toBe(false);
    expect(isExportedGraph({})).toBe(false);
    expect(isExportedGraph({ format: 'something-else', version: 1, nodes: [], targets: [] })).toBe(
      false,
    );
  });

  it('rejects a file from a different format version', () => {
    expect(
      isExportedGraph({
        format: EXPORT_FORMAT,
        version: EXPORT_FORMAT_VERSION + 1,
        exportedAt: '',
        nodes: [],
        targets: [],
      }),
    ).toBe(false);
  });

  it('rejects a file whose nodes are malformed', () => {
    expect(
      isExportedGraph({
        format: EXPORT_FORMAT,
        version: EXPORT_FORMAT_VERSION,
        exportedAt: '',
        nodes: [{ id: 'a' }],
        targets: [],
      }),
    ).toBe(false);
  });
});
