import { describe, it, expect } from 'vitest';

import { buildTestWorld } from '../testFixtures';
import { buildTestContext } from '../testContext';

const setup = () => buildTestContext(buildTestWorld());

/** Walks the setup flow the way the drawers do: product, building, recipe. */
const addTarget = async (ctx: ReturnType<typeof setup>, recipeId: string, productId: string) => {
  ctx.actions.createTarget();
  await ctx.actions.setTargetProduct(productId);
  await ctx.actions.setTargetMachine(ctx.state.recipes.items[recipeId].machine);
  await ctx.actions.setTargetRecipe(recipeId);
  ctx.actions.setActiveTarget(null);
  return ctx.state.recipes.targetsList[ctx.state.recipes.targetsList.length - 1];
};

describe('targets', () => {
  it('seeds a node and defaults the volume to one building', async () => {
    const ctx = setup();
    const target = await addTarget(ctx, 'cast_steel', 'steel');

    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(1);
    // cast_steel makes 12 steel per 60s, so one building is the natural default.
    expect(target.quantity).toBe(12);
    expect(ctx.state.recipes.nodes[target.nodeId!].machinesCount).toBeCloseTo(1, 6);
  });

  it('sizes the chain fractionally from the target volume', async () => {
    const ctx = setup();
    const target = await addTarget(ctx, 'cast_steel', 'steel');

    ctx.actions.setTargetQuantity({ targetId: target.id, quantity: 30 });

    // 30 / 12 = 2.5 casters.
    expect(ctx.state.recipes.nodes[target.nodeId!].machinesCount).toBeCloseTo(2.5, 6);
  });

  it('reuses one node when a second target needs the same recipe', async () => {
    const ctx = setup();
    const first = await addTarget(ctx, 'cast_steel', 'steel');
    const second = await addTarget(ctx, 'cast_steel', 'steel');

    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(1);
    expect(second.nodeId).toBe(first.nodeId);
  });

  it('keeps a shared supplier when one of its targets is removed', async () => {
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
      quantity: 12,
      nodeId: caster.id,
    };
    ctx.state.recipes.targets['t2'] = {
      id: 't2',
      productId: 'molten_steel' as any,
      machineId: 'smelter' as any,
      recipeId: 'smelt_steel' as any,
      quantity: 12,
      nodeId: Object.values(ctx.state.recipes.nodes).find((n) => n.id !== caster.id)!.id,
    };
    ctx.actions.recalculate();

    ctx.actions.removeTarget('t2');

    // The smelter still feeds the caster, so it survives the prune.
    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(2);
  });

  it('prunes a chain that nothing targets any more', async () => {
    const ctx = setup();
    const target = await addTarget(ctx, 'cast_steel', 'steel');
    await ctx.actions.linkRecipe({
      currentNodeId: target.nodeId!,
      newNodeId: 'smelt_steel',
      productId: 'molten_steel',
      direction: 'input',
    });
    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(2);

    ctx.actions.removeTarget(target.id);

    expect(Object.keys(ctx.state.recipes.nodes)).toHaveLength(0);
    expect(Object.keys(ctx.state.recipes.targets)).toHaveLength(0);
  });

  it('honours a pinned count and reports the resulting shortfall', async () => {
    const ctx = setup();
    const target = await addTarget(ctx, 'cast_steel', 'steel');
    ctx.actions.setTargetQuantity({ targetId: target.id, quantity: 36 });

    ctx.actions.setNodeMachinesCount({ nodeId: target.nodeId!, count: 1 });

    const node = ctx.state.recipes.nodes[target.nodeId!];
    expect(node.machinesCount).toBe(1);
    // Asked for 36 but only making 12.
    expect(node.outputs['steel'].rate).toBeCloseTo(12, 6);
  });

  it('returns to demand-derived sizing when the pin is cleared', async () => {
    const ctx = setup();
    const target = await addTarget(ctx, 'cast_steel', 'steel');
    ctx.actions.setTargetQuantity({ targetId: target.id, quantity: 36 });

    ctx.actions.setNodeMachinesCount({ nodeId: target.nodeId!, count: 1 });
    ctx.actions.setNodeMachinesCount({ nodeId: target.nodeId!, count: null });

    expect(ctx.state.recipes.nodes[target.nodeId!].machinesCount).toBeCloseTo(3, 6);
  });

  it('persists after every change', async () => {
    const ctx = setup();
    await addTarget(ctx, 'cast_steel', 'steel');

    const saved: any = ctx.getStoredGraph();
    expect(saved.nodes).toHaveLength(1);
    expect(saved.targets).toHaveLength(1);
  });
});
