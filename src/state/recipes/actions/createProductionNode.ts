import { Action } from "state/_types";
import { RecipeId, RecipeProduct } from "state/app/effects/loadJsonData";
import ProductionNode from "../ProductionNode";

/**
 * Builds a production node for a recipe and registers it in the graph. Returns
 * the registered instance from state, so callers mutate the tracked object
 * rather than a detached copy.
 */
export const createProductionNode: Action<RecipeId, ProductionNode> = ({ state, actions }, recipeId) => {

    let recipe = state.recipes.items[recipeId]
    let machine = state.machines.items[recipe.machine]
    let category = state.categories.items[machine.category_id]
    let inputs = recipe.inputs.map(({ id, quantity }: RecipeProduct) => ({ ...state.products.items[id], quantity }))
    let outputs = recipe.outputs.map(({ id, quantity }: RecipeProduct) => ({ ...state.products.items[id], quantity }))
    let sources = actions.recipes.getInputSources(recipeId)
    let targets = actions.recipes.getOutputTargets(recipeId)

    let node = new ProductionNode({ recipe, machine, category, inputs, outputs, sources, targets })

    state.recipes.nodes[node.id] = node

    return state.recipes.nodes[node.id]

}
