import { describe, it, expect } from 'vitest';

import { buildTestWorld, makeChainTarget } from '../testFixtures';
import { buildTestContext } from '../testContext';

const setup = () => buildTestContext(buildTestWorld());

describe('linkRecipe', () => {
  it('creates a new node and links it as an input source', async () => {
    const { state, actions } = setup();

    const caster = actions.createProductionNode({ recipeId: 'cast_steel' });

    await actions.linkRecipe({
      currentNodeId: caster.id,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });

    const nodes = Object.values(state.recipes.nodes);
    expect(nodes).toHaveLength(2);

    const smelter = nodes.find((n) => n.id !== caster.id)!;
    expect(smelter.recipe.id).toBe('smelt_steel');

    // The link records topology only; the solver owns the quantities.
    expect(caster.inputs['molten_steel'].imports.map((i: { source: string }) => i.source)).toEqual([
      smelter.id,
    ]);
    expect(
      smelter.outputs['molten_steel'].exports.map((e: { target: string }) => e.target),
    ).toEqual([caster.id]);
  });

  it('creates a new node and links it as an output target', async () => {
    const { state, actions } = setup();

    const smelter = actions.createProductionNode({ recipeId: 'smelt_steel' });

    await actions.linkRecipe({
      currentNodeId: smelter.id,
      newNodeId: 'cast_steel',
      productId: 'molten_steel',
      direction: 'output',
    });

    const caster = Object.values(state.recipes.nodes).find((n) => n.id !== smelter.id)!;
    expect(caster.recipe.id).toBe('cast_steel');

    expect(
      smelter.outputs['molten_steel'].exports.map((e: { target: string }) => e.target),
    ).toEqual([caster.id]);
    expect(caster.inputs['molten_steel'].imports.map((i: { source: string }) => i.source)).toEqual([
      smelter.id,
    ]);
  });

  it('reuses an existing node for the same recipe instead of duplicating it', async () => {
    const { state, actions } = setup();

    const caster = actions.createProductionNode({ recipeId: 'cast_steel' });
    const smelter = actions.createProductionNode({ recipeId: 'smelt_steel' });

    await actions.linkRecipe({
      currentNodeId: caster.id,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });

    expect(Object.keys(state.recipes.nodes)).toHaveLength(2);
    expect(caster.inputs['molten_steel'].imports.map((i: { source: string }) => i.source)).toEqual([
      smelter.id,
    ]);
  });

  it('solves the flow between linked nodes once a target sets demand', async () => {
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
      quantity: 24,
      nodeId: caster.id,
    });
    actions.recalculate();

    // 24 steel needs 2 casters, needing 24 molten steel, needing 2 smelters.
    expect(caster.machinesCount).toBeCloseTo(2, 6);
    expect(smelter.machinesCount).toBeCloseTo(2, 6);
    expect(caster.inputs['molten_steel'].imported).toBeCloseTo(24, 6);
    expect(caster.inputs['molten_steel'].satisfied).toBe(true);
  });
});

describe('findReusableNode cycle guard', () => {
  it('rejects a candidate that already supplies the anchor when linking an output', async () => {
    const { state, actions } = setup();

    // smelter -> caster.
    const caster = actions.createProductionNode({ recipeId: 'cast_steel' });
    await actions.linkRecipe({
      currentNodeId: caster.id,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });
    const smelter = Object.values(state.recipes.nodes).find((n) => n.id !== caster.id)!;

    // Reusing the smelter as something the caster feeds would close the loop
    // caster -> smelter -> caster, so it must be rejected.
    const reusable = actions.findReusableNode({
      recipeId: 'smelt_steel',
      anchorNodeId: caster.id,
      direction: 'output',
    });

    expect(reusable).toBeNull();
    // The same candidate is fine in the other direction: it already supplies it.
    expect(
      actions.findReusableNode({
        recipeId: 'smelt_steel',
        anchorNodeId: caster.id,
        direction: 'input',
      }),
    ).toBe(smelter.id);
  });

  it('leaves an existing link intact when the same link is requested twice', async () => {
    const { state, actions } = setup();
    const caster = actions.createProductionNode({ recipeId: 'cast_steel' });
    const smelter = actions.createProductionNode({ recipeId: 'smelt_steel' });

    await actions.linkExistingRecipe({
      currentNodeId: caster.id,
      existingNodeId: smelter.id,
      productId: 'molten_steel',
      direction: 'input',
    });
    // A repeat must not roll back the link that already exists.
    await actions.linkExistingRecipe({
      currentNodeId: caster.id,
      existingNodeId: smelter.id,
      productId: 'molten_steel',
      direction: 'input',
    });

    expect(caster.inputs['molten_steel'].imports).toHaveLength(1);
    expect(smelter.outputs['molten_steel'].exports).toHaveLength(1);
    expect(Object.keys(state.recipes.nodes)).toHaveLength(2);
  });
});
