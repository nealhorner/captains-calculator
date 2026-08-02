import { describe, it, expect } from 'vitest';

import { buildTestWorld, makeChainTarget } from '../testFixtures';
import { buildTestContext } from '../testContext';

const setup = () => buildTestContext(buildTestWorld());

describe('deleteNode', () => {
  it('removes an unconnected node and persists the change', async () => {
    const { state, actions, getStoredGraph } = setup();
    const node = actions.createProductionNode({ recipeId: 'cast_steel' });

    await actions.deleteNode(node.id);

    expect(Object.keys(state.recipes.nodes)).toHaveLength(0);
    expect((getStoredGraph() as any).nodes).toHaveLength(0);
  });

  it('drops the supplier link when the consumer is deleted', async () => {
    const { state, actions } = setup();
    const caster = actions.createProductionNode({ recipeId: 'cast_steel' });
    await actions.linkRecipe({
      currentNodeId: caster.id,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });
    const smelter = Object.values(state.recipes.nodes).find((n) => n.id !== caster.id)!;

    await actions.deleteNode(caster.id);

    // No dangling export pointing at a node that no longer exists.
    expect(smelter.outputs['molten_steel'].exports).toEqual([]);
  });

  it('leaves the consumer needing an outside supply when its supplier is deleted', async () => {
    const { state, actions } = setup();
    const caster = actions.createProductionNode({ recipeId: 'cast_steel' });
    await actions.linkRecipe({
      currentNodeId: caster.id,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });
    const smelter = Object.values(state.recipes.nodes).find((n) => n.id !== caster.id)!;

    state.recipes.targets['t1'] = makeChainTarget({
      id: 't1',
      productId: 'steel',
      machineId: 'caster',
      recipeId: 'cast_steel',
      quantity: 12,
      nodeId: caster.id,
    });
    actions.recalculate();
    expect(caster.inputs['molten_steel'].satisfied).toBe(true);

    await actions.deleteNode(smelter.id);

    expect(caster.inputs['molten_steel'].imports).toEqual([]);
    // The chain is re-solved, so the gap shows up as a raw input.
    expect(caster.inputs['molten_steel'].satisfied).toBe(false);
    expect(caster.inputs['molten_steel'].deficit).toBeCloseTo(12, 6);
  });

  it('removes the target when its own node is deleted', async () => {
    const { state, actions } = setup();
    const caster = actions.createProductionNode({ recipeId: 'cast_steel' });
    state.recipes.targets['t1'] = makeChainTarget({
      id: 't1',
      productId: 'steel',
      machineId: 'caster',
      recipeId: 'cast_steel',
      quantity: 12,
      nodeId: caster.id,
    });

    await actions.deleteNode(caster.id);

    expect(Object.keys(state.recipes.targets)).toHaveLength(0);
  });
});
