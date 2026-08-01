import { AsyncAction } from "state/_types";
import { ProductId } from '../../app/effects/loadJsonData';

export type LinkExistingRecipeParams = {
    currentNodeId: string;
    existingNodeId: string;
    productId: ProductId;
    direction: 'input' | 'output';
}

/**
 * Links two nodes that are both already in the graph. Records topology only —
 * `recalculate` resolves the flow quantities for the whole chain.
 */
export const linkExistingRecipe: AsyncAction<LinkExistingRecipeParams> = async ({ state, actions }, { currentNodeId, existingNodeId, productId, direction }) => {

    let currentNode = state.recipes.nodes[currentNodeId]
    let existingNode = state.recipes.nodes[existingNodeId]

    if (!currentNode || !existingNode || currentNodeId === existingNodeId) return

    if (direction === 'input') {
        currentNode.addImportLink(productId, existingNode.id)
        existingNode.addExportLink(productId, currentNodeId)
    } else {
        existingNode.addImportLink(productId, currentNodeId)
        currentNode.addExportLink(productId, existingNode.id)
    }

    actions.recipes.recalculate()

}
