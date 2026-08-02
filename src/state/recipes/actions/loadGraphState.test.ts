import { describe, it, expect } from 'vitest';

import { buildTestWorld, makeChainTarget } from '../testFixtures';
import { buildTestContext } from '../testContext';

const setup = () => buildTestContext(buildTestWorld());

describe('loadGraphState', () => {
  it('restores a saved chain with its targets on start-up', async () => {
    const first = setup();
    const caster = first.actions.createProductionNode({ recipeId: 'cast_steel' });
    await first.actions.linkRecipe({
      currentNodeId: caster.id,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });
    first.state.recipes.targets['t1'] = makeChainTarget({
      id: 't1',
      productId: 'steel',
      machineId: 'caster',
      recipeId: 'cast_steel',
      quantity: 24,
      nodeId: caster.id,
    });
    first.actions.recalculate();

    // A fresh session pointed at the same stored graph.
    const next = setup();
    next.setStoredGraph(first.getStoredGraph());
    next.actions.loadGraphState();

    expect(Object.keys(next.state.recipes.nodes)).toHaveLength(2);
    expect(Object.keys(next.state.recipes.targets)).toHaveLength(1);
    // Restored chains arrive already sized.
    expect(next.state.recipes.nodes[caster.id].machinesCount).toBeCloseTo(2, 6);
  });

  it('does nothing when there is no saved graph', () => {
    const ctx = setup();
    ctx.setStoredGraph(null);

    ctx.actions.loadGraphState();

    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(0);
  });

  it('ignores a saved graph in an unrecognised format', () => {
    const ctx = setup();
    ctx.setStoredGraph({ some: 'other shape' });

    ctx.actions.loadGraphState();

    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(0);
  });
});
