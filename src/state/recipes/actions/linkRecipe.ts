import { AsyncAction } from "state/_types";
import { ProductId, RecipeId } from '../../app/effects/loadJsonData';

export type LinkRecipeParams = {
    currentNodeId: string;
    newNodeId: RecipeId;
    productId: ProductId;
    direction: 'input' | 'output';
}

/**
 * Links a node to a new supplier or consumer built from `newNodeId`.
 *
 * If the graph already contains a node for that recipe, it is reused instead of
 * duplicated — so two chains needing the same intermediate share one supplier,
 * whose demand is then the sum of both.
 *
 * Flow quantities are not set here: `recalculate` resolves them for the whole
 * chain once the link exists.
 */
export const linkRecipe: AsyncAction<LinkRecipeParams> = async ({ state, actions }, { currentNodeId, newNodeId, productId, direction }) => {

    let currentNode = state.recipes.nodes[currentNodeId]
    if (!currentNode) return

    let reusable = actions.recipes.findReusableNode({ recipeId: newNodeId, consumerNodeId: currentNodeId })

    if (reusable) {
        await actions.recipes.linkExistingRecipe({
            currentNodeId,
            existingNodeId: reusable,
            productId,
            direction
        })
        return
    }

    let newNode = actions.recipes.createProductionNode(newNodeId)

    if (direction === 'input') {
        currentNode.addImportLink(productId, newNode.id)
        newNode.addExportLink(productId, currentNodeId)
    } else {
        newNode.addImportLink(productId, currentNodeId)
        currentNode.addExportLink(productId, newNode.id)
    }

    actions.recipes.recalculate()

}
