import { describe, it, expect } from 'vitest';

import { buildTestWorld } from './testFixtures';
import { buildTestContext } from './testContext';

const setup = () => buildTestContext(buildTestWorld());

/**
 * The path a user actually walks in the setup bar: add a target, choose the
 * product, building and recipe, then set how much is wanted.
 */
describe('editor flow', () => {
  const chooseTarget = async (ctx: ReturnType<typeof setup>, recipeId: string, product: string) => {
    ctx.actions.createTarget();
    await ctx.actions.setTargetProduct(product);
    await ctx.actions.setTargetMachine(ctx.state.recipes.items[recipeId].machine);
    await ctx.actions.setTargetRecipe(recipeId);
    ctx.actions.setActiveTarget(null);
  };

  it('creates a node once a recipe is chosen, and links a supplier to it', async () => {
    const ctx = setup();

    await chooseTarget(ctx, 'cast_steel', 'steel');
    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(1);

    const caster = ctx.state.recipes.nodesList[0];
    await ctx.actions.linkRecipe({
      currentNodeId: caster.id,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });

    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(2);
    expect(caster.inputs['molten_steel'].satisfied).toBe(true);
  });

  it('does not create a node until a recipe is chosen', async () => {
    const ctx = setup();

    ctx.actions.createTarget();
    await ctx.actions.setTargetProduct('steel');

    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(0);
  });

  it('sizes the whole chain from the target volume', async () => {
    const ctx = setup();
    await chooseTarget(ctx, 'cast_steel', 'steel');

    const target = ctx.state.recipes.targetsList[0];
    const caster = ctx.state.recipes.nodes[target.nodeId!];
    await ctx.actions.linkRecipe({
      currentNodeId: caster.id,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });

    ctx.actions.setTargetQuantity({ targetId: target.id, quantity: 60 });

    const smelter = ctx.state.recipes.nodesList.find((n) => n.id !== caster.id)!;
    // 60 steel needs 5 casters, needing 60 molten steel, needing 5 smelters.
    expect(caster.machinesCount).toBeCloseTo(5, 6);
    expect(smelter.machinesCount).toBeCloseTo(5, 6);
  });

  it('starts a second target from the same recipe without duplicating the node', async () => {
    const ctx = setup();
    await chooseTarget(ctx, 'cast_steel', 'steel');
    await chooseTarget(ctx, 'cast_steel', 'steel');

    expect(Object.keys(ctx.state.recipes.targets)).toHaveLength(2);
    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(1);
  });
});
