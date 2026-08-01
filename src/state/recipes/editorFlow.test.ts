import { describe, it, expect } from 'vitest';

import { selectRecipe } from './actions/selectRecipe';
import { linkRecipe } from './actions/linkRecipe';
import { deleteNode } from './actions/deleteNode';
import { getInputSources } from './actions/getInputSources';
import { getOutputTargets } from './actions/getOutputTargets';
import { linkExistingRecipe } from './actions/linkExistingRecipe';
import ProductionNode from './ProductionNode';
import {
  loadMachineData,
  loadProductData,
  loadRecipeData,
  loadCategoryData,
} from 'state/app/effects/loadJsonData';
import { RecipeId } from 'state/app/effects';

// Integration test wiring the real Editor actions together against real game
// data, the way the UI drives them: select a recipe -> link an input source
// -> delete a linked node. Each action is exercised through the same shared
// state/actions object the Overmind runtime would give them.
describe('Editor flow: select recipe -> link recipe -> delete node', () => {
  const buildEditor = () => {
    const state = {
      recipes: {
        items: loadRecipeData(),
        nodes: {} as { [id: string]: ProductionNode },
        currentItemId: null as string | null,
      },
      machines: { items: loadMachineData() },
      categories: { items: loadCategoryData() },
      products: { items: loadProductData() },
    };

    const context = { state } as any;
    const actions = {
      recipes: {
        getInputSources: (recipeId: RecipeId) => getInputSources(context, recipeId),
        getOutputTargets: (recipeId: RecipeId) => getOutputTargets(context, recipeId),
        linkExistingRecipe: (params: any) => linkExistingRecipe(context, params),
        saveGraphState: () => {},
      },
    };
    context.actions = actions;

    return {
      selectRecipe: (recipeId: RecipeId | null) => selectRecipe(context, recipeId),
      linkRecipe: (params: Parameters<typeof linkRecipe>[1]) => linkRecipe(context, params),
      deleteNode: (nodeId: string) => deleteNode(context, nodeId),
      state,
    };
  };

  it('selecting a recipe creates a node, and linking an input source connects the two', async () => {
    const editor = buildEditor();

    // User selects the "acid_dumping" recipe (consumes acid) via Product -> Machine -> Recipe.
    await editor.selectRecipe('acid_dumping' as RecipeId);

    let nodes = Object.values(editor.state.recipes.nodes);
    expect(nodes).toHaveLength(1);
    const consumerNode = nodes[0];
    expect(consumerNode.recipe.id).toBe('acid_dumping');
    expect(consumerNode.inputs['acid'].imported).toBe(0);

    // User links "acid_mixing" (produces acid) as an input source for it.
    await editor.linkRecipe({
      currentNodeId: consumerNode.id,
      newNodeId: 'acid_mixing' as RecipeId,
      productId: 'acid',
      direction: 'input',
    });

    nodes = Object.values(editor.state.recipes.nodes);
    expect(nodes).toHaveLength(2);

    const producerNode = nodes.find((n) => n.id !== consumerNode.id)!;
    expect(producerNode.recipe.id).toBe('acid_mixing');

    // The link is reflected on both sides of the connection.
    expect(consumerNode.inputs['acid'].imported).toBeGreaterThan(0);
    expect(consumerNode.inputs['acid'].imports).toEqual([
      { source: producerNode.id, quantity: consumerNode.inputs['acid'].imported },
    ]);
    expect(producerNode.outputs['acid'].exported).toBe(consumerNode.inputs['acid'].imported);

    // The pair is what would feed react-flow: two nodes, one connecting edge.
    expect(consumerNode.edgeData).toHaveLength(1);
    expect(consumerNode.edgeData[0]).toMatchObject({
      source: producerNode.id,
      target: consumerNode.id,
    });

    // Deleting the linked producer removes it and clears the consumer's import.
    await editor.deleteNode(producerNode.id);

    nodes = Object.values(editor.state.recipes.nodes);
    expect(nodes).toHaveLength(1);
    expect(consumerNode.inputs['acid'].imported).toBe(0);
    expect(consumerNode.inputs['acid'].maxed).toBe(false);
  });

  it('selecting a null recipe does not create a node', async () => {
    const editor = buildEditor();

    await editor.selectRecipe(null);

    expect(Object.values(editor.state.recipes.nodes)).toHaveLength(0);
  });
});
