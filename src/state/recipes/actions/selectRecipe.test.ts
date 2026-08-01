import { describe, it, expect, vi } from 'vitest';

import { selectRecipe } from './selectRecipe';
import ProductionNode from '../ProductionNode';
import {
  loadMachineData,
  loadProductData,
  loadRecipeData,
  loadCategoryData,
} from 'state/app/effects/loadJsonData';

const recipeData = loadRecipeData();
const machineData = loadMachineData();
const productData = loadProductData();
const categoryData = loadCategoryData();

type SelectRecipeContext = Parameters<typeof selectRecipe>[0];

const buildContext = () => {
  const state = {
    recipes: {
      items: recipeData,
      nodes: {} as { [id: string]: ProductionNode },
      currentItemId: null as string | null,
    },
    machines: { items: machineData },
    categories: { items: categoryData },
    products: { items: productData },
  };

  const saveGraphState = vi.fn();
  const actions = {
    recipes: {
      getInputSources: vi.fn(() => ({})),
      getOutputTargets: vi.fn(() => ({})),
      saveGraphState,
    },
  };

  const context = { state, actions } as unknown as SelectRecipeContext;
  return { context, state, actions, saveGraphState };
};

describe('selectRecipe', () => {
  it('sets currentItemId and creates a production node for the selected recipe', async () => {
    const { context, state, saveGraphState } = buildContext();

    await selectRecipe(context, 'acid_mixing');

    expect(state.recipes.currentItemId).toBe('acid_mixing');

    const nodes = Object.values(state.recipes.nodes);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].recipe.id).toBe('acid_mixing');
    expect(saveGraphState).toHaveBeenCalledTimes(1);
  });

  it('sets currentItemId to null and does not create a node when recipeId is null', async () => {
    const { context, state, saveGraphState } = buildContext();

    await selectRecipe(context, null);

    expect(state.recipes.currentItemId).toBeNull();
    expect(Object.values(state.recipes.nodes)).toHaveLength(0);
    expect(saveGraphState).not.toHaveBeenCalled();
  });
});
