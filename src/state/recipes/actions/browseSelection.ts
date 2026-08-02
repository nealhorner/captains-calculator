import { Action } from 'state/_types';
import { RecipeId } from 'state/app/effects/loadJsonData';

/**
 * Plain browse-selection actions for the Products, Recipes and Home screens
 * (all currently unrouted). These record what the user is *looking at* and have
 * no effect on the calculator graph — building a chain goes through the target
 * actions instead.
 */

/** Sets which recipe is being viewed. Does not add anything to the graph. */
export const setCurrentRecipe: Action<RecipeId | null> = ({ state }, recipeId) => {
  state.recipes.currentItemId = recipeId;
};

export const selectRecipesItem: Action<RecipeId> = ({ state }, recipeId) => {
  if (state.recipes.selectedRecipeIds.indexOf(recipeId) >= 0) return;
  state.recipes.selectedRecipeIds.push(recipeId);
};

export const deSelectRecipesItem: Action<RecipeId | null> = ({ state }, recipeId) => {
  if (recipeId === null) {
    state.recipes.selectedRecipeIds = [];
    return;
  }
  state.recipes.selectedRecipeIds = state.recipes.selectedRecipeIds.filter(
    (id: RecipeId) => id !== recipeId,
  );
};
