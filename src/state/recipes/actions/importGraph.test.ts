import { describe, expect, it, vi } from 'vitest';

import { importGraph } from './importGraph';
import { buildExportedGraph } from '../importExport';
import { buildTestWorld } from '../testFixtures';
import ProductionNode from '../ProductionNode';

const buildContext = (world: ReturnType<typeof buildTestWorld>) =>
  ({
    state: {
      recipes: {
        items: world.recipes,
        nodes: {} as { [key: string]: ProductionNode },
        currentNodeId: 'something-stale',
      },
      machines: { items: world.machines },
      categories: { items: world.categories },
      products: { items: world.products },
    },
    actions: {
      recipes: {
        getInputSources: vi.fn().mockReturnValue({}),
        getOutputTargets: vi.fn().mockReturnValue({}),
        saveGraphState: vi.fn(),
      },
    },
  }) as any;

describe('importGraph action', () => {
  it('rejects data that is not a valid exported graph', () => {
    const world = buildTestWorld();
    const context = buildContext(world);

    const result = importGraph(context, { not: 'a graph' });

    expect(result).toEqual({ imported: 0, skipped: 0, errors: [expect.any(String)] });
    expect(context.state.recipes.nodes).toEqual({});
    expect(context.actions.recipes.saveGraphState).not.toHaveBeenCalled();
  });

  it('round-trips a linked two-node graph exactly', () => {
    const world = buildTestWorld();
    const { smelterNode, casterNode } = world;

    const exported = buildExportedGraph([smelterNode, casterNode]);

    const context = buildContext(world);
    const result = importGraph(context, exported);

    expect(result).toEqual({ imported: 2, skipped: 0, errors: [] });
    expect(context.state.recipes.currentNodeId).toBeNull();
    expect(context.actions.recipes.saveGraphState).toHaveBeenCalledTimes(1);

    const importedNodes = context.state.recipes.nodes;
    expect(Object.keys(importedNodes).sort()).toEqual([casterNode.id, smelterNode.id].sort());

    const rebuiltSmelter = importedNodes[smelterNode.id];
    const rebuiltCaster = importedNodes[casterNode.id];

    // Real ProductionNode instances, not plain objects, so instance
    // methods (addImport/canExport/etc, used elsewhere in the app)
    // keep working after import.
    expect(rebuiltSmelter).toBeInstanceOf(ProductionNode);
    expect(rebuiltCaster).toBeInstanceOf(ProductionNode);

    expect(rebuiltSmelter.machinesCount).toBe(smelterNode.machinesCount);
    expect(rebuiltSmelter.duration).toBe(smelterNode.duration);
    expect(rebuiltSmelter.outputs).toEqual(smelterNode.outputs);

    expect(rebuiltCaster.inputs.molten_steel.imported).toBe(12);
    expect(rebuiltCaster.inputs.molten_steel.maxed).toBe(true);
    expect(rebuiltCaster.inputs.molten_steel.imports).toEqual([
      { source: smelterNode.id, quantity: 12 },
    ]);
    expect(rebuiltSmelter.outputs.molten_steel.exports).toEqual([
      { target: casterNode.id, quantity: 12 },
    ]);
  });

  it('skips nodes whose recipe no longer exists and reports it', () => {
    const world = buildTestWorld();
    const { smelterNode, casterNode } = world;

    const exported = buildExportedGraph([smelterNode, casterNode]);
    exported.nodes[0].recipeId = 'deleted_recipe' as any;

    const context = buildContext(world);
    const result = importGraph(context, exported);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('deleted_recipe');

    expect(Object.keys(context.state.recipes.nodes)).toEqual([exported.nodes[1].id]);

    // The surviving caster node imported molten_steel from the now-skipped
    // smelter — that dangling link must be stripped, not left pointing at
    // a node id that no longer exists in the graph.
    const survivingCaster = context.state.recipes.nodes[casterNode.id];
    expect(survivingCaster.inputs.molten_steel.imports).toEqual([]);
    expect(survivingCaster.inputs.molten_steel.imported).toBe(0);
    expect(survivingCaster.inputs.molten_steel.maxed).toBe(false);
  });

  it('does not wipe the existing graph when every node is skipped', () => {
    const world = buildTestWorld();
    const context = buildContext(world);
    context.state.recipes.nodes = { [world.smelterNode.id]: world.smelterNode };

    const exported = buildExportedGraph([world.casterNode]);
    exported.nodes[0].recipeId = 'deleted_recipe' as any;

    const result = importGraph(context, exported);

    expect(result).toEqual({ imported: 0, skipped: 1, errors: [expect.any(String)] });
    expect(context.state.recipes.nodes).toEqual({ [world.smelterNode.id]: world.smelterNode });
    expect(context.actions.recipes.saveGraphState).not.toHaveBeenCalled();
  });

  it('skips duplicate node ids instead of silently overwriting', () => {
    const world = buildTestWorld();
    const context = buildContext(world);

    const exported = buildExportedGraph([world.smelterNode]);
    exported.nodes.push({ ...exported.nodes[0] });

    const result = importGraph(context, exported);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toContain('duplicate');
    expect(Object.keys(context.state.recipes.nodes)).toEqual([world.smelterNode.id]);
  });

  it('does not mistake a node id for an inherited Object property', () => {
    const world = buildTestWorld();
    const context = buildContext(world);

    const exported = buildExportedGraph([world.smelterNode]);
    exported.nodes[0].id = 'constructor';

    const result = importGraph(context, exported);

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] });
    expect(context.state.recipes.nodes['constructor']).toBeInstanceOf(ProductionNode);
  });

  it('treats a link to a non-existent inherited-property-named node as dangling', () => {
    const world = buildTestWorld();
    const context = buildContext(world);

    const exported = buildExportedGraph([world.casterNode]);
    // The export claims molten_steel was imported from a node called
    // "constructor" — a node that was never actually included in the
    // export. A naive `newNodes["constructor"]` lookup would be truthy
    // (inherited from Object.prototype) even though no such node exists.
    exported.nodes[0].inputs.molten_steel.imports = [{ source: 'constructor', quantity: 12 }];
    exported.nodes[0].inputs.molten_steel.imported = 12;
    exported.nodes[0].inputs.molten_steel.maxed = true;

    const result = importGraph(context, exported);

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] });

    const rebuiltCaster = context.state.recipes.nodes[world.casterNode.id];
    expect(rebuiltCaster.inputs.molten_steel.imports).toEqual([]);
    expect(rebuiltCaster.inputs.molten_steel.imported).toBe(0);
    expect(rebuiltCaster.inputs.molten_steel.maxed).toBe(false);
  });

  it('replaces the existing graph rather than merging into it', () => {
    const world = buildTestWorld();
    const context = buildContext(world);

    context.state.recipes.nodes = { 'stale-node-id': {} as ProductionNode };

    const exported = buildExportedGraph([world.smelterNode]);
    importGraph(context, exported);

    expect(context.state.recipes.nodes['stale-node-id']).toBeUndefined();
    expect(Object.keys(context.state.recipes.nodes)).toEqual([world.smelterNode.id]);
  });
});
