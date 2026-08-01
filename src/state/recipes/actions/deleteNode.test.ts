import { describe, it, expect, vi } from 'vitest';

import { deleteNode } from './deleteNode';
import ProductionNode from '../ProductionNode';
import {
  loadMachineData,
  loadProductData,
  loadRecipeData,
  loadCategoryData,
} from 'state/app/effects/loadJsonData';
import { RecipeId } from 'state/app/effects';

const recipeData = loadRecipeData();
const machineData = loadMachineData();
const productData = loadProductData();
const categoryData = loadCategoryData();

type DeleteNodeContext = Parameters<typeof deleteNode>[0];

const buildNode = (recipeId: RecipeId): ProductionNode => {
  const recipe = recipeData[recipeId];
  const machine = machineData[recipe.machine];
  const category = categoryData[machine.category_id];
  const inputs = recipe.inputs.map(({ id, quantity }) => ({ ...productData[id], quantity }));
  const outputs = recipe.outputs.map(({ id, quantity }) => ({ ...productData[id], quantity }));
  return new ProductionNode({
    recipe,
    machine,
    category,
    inputs,
    outputs,
    sources: {},
    targets: {},
  });
};

const buildContext = (nodes: { [id: string]: ProductionNode }) => {
  const state = { recipes: { nodes } };
  const saveGraphState = vi.fn();
  const linkExistingRecipe = vi.fn();
  const actions = { recipes: { saveGraphState, linkExistingRecipe } };

  const context = { state, actions } as unknown as DeleteNodeContext;
  return { context, state, saveGraphState, linkExistingRecipe };
};

describe('deleteNode', () => {
  it('removes an unconnected node from state and saves graph state', async () => {
    const node = buildNode('acid_mixing');
    const { context, state, saveGraphState } = buildContext({ [node.id]: node });

    await deleteNode(context, node.id);

    expect(state.recipes.nodes).toEqual({});
    expect(saveGraphState).toHaveBeenCalledTimes(1);
  });

  it('unmaxes the source node export when a node with an import is deleted', async () => {
    const source = buildNode('acid_mixing');
    const target = buildNode('acid_dumping');
    const [inputId] = Object.keys(target.inputs);

    source.addExport(inputId, target.id, 10);
    target.addImport(inputId, source.id, 10);
    source.outputs[inputId].maxed = true;

    const { context, state } = buildContext({ [source.id]: source, [target.id]: target });

    await deleteNode(context, target.id);

    expect(source.outputs[inputId].maxed).toBe(false);
    expect(state.recipes.nodes).toEqual({ [source.id]: source });
  });

  it('resets a downstream import and relinks remaining sources when a re-exporting node is deleted', async () => {
    const sourceA = buildNode('acid_mixing');
    const sourceB = buildNode('acid_mixing');
    // Node ids are derived from Date.now(); force distinct ids so the two
    // don't collide when created within the same millisecond.
    sourceB.id = `${sourceB.id}_b`;
    const target = buildNode('acid_dumping');
    const [inputId] = Object.keys(target.inputs);

    // target imports acid from both sourceA and sourceB
    target.inputs[inputId].imported = 20;
    target.inputs[inputId].maxed = true;
    target.inputs[inputId].imports = [
      { source: sourceA.id, quantity: 10 },
      { source: sourceB.id, quantity: 10 },
    ];
    sourceB.outputs[inputId].exported = 10;
    sourceB.outputs[inputId].exports = [{ target: target.id, quantity: 10 }];

    const { context, state, linkExistingRecipe, saveGraphState } = buildContext({
      [sourceA.id]: sourceA,
      [sourceB.id]: sourceB,
      [target.id]: target,
    });

    await deleteNode(context, sourceB.id);

    // sourceB removed, sourceA/target remain
    expect(state.recipes.nodes).toEqual({ [sourceA.id]: sourceA, [target.id]: target });

    // target's import is reset before being relinked to its remaining source
    expect(target.inputs[inputId].maxed).toBe(false);
    expect(target.inputs[inputId].imported).toBe(0);
    expect(target.inputs[inputId].imports).toEqual([]);

    expect(linkExistingRecipe).toHaveBeenCalledWith({
      currentNodeId: sourceA.id,
      existingNodeId: target.id,
      productId: inputId,
      direction: 'output',
    });

    expect(saveGraphState).toHaveBeenCalledTimes(1);
  });
});
