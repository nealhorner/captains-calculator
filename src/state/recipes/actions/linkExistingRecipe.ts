import { AsyncAction } from 'state/_types';
import { ProductId } from '../../app/effects/loadJsonData';

export type LinkExistingRecipeParams = {
  currentNodeId: string;
  existingNodeId: string;
  productId: ProductId;
  direction: 'input' | 'output';
};

/**
 * Links two nodes that are both already in the graph. Records topology only —
 * `recalculate` resolves the flow quantities for the whole chain.
 */
export const linkExistingRecipe: AsyncAction<LinkExistingRecipeParams> = async (
  { state, actions },
  { currentNodeId, existingNodeId, productId, direction },
) => {
  let currentNode = state.recipes.nodes[currentNodeId];
  let existingNode = state.recipes.nodes[existingNodeId];

  if (!currentNode || !existingNode || currentNodeId === existingNodeId) return;

  // Both sides or neither — see `linkRecipe` for why a half-link is harmful.
  let consumer = direction === 'input' ? currentNode : existingNode;
  let supplier = direction === 'input' ? existingNode : currentNode;

  let linked =
    consumer.addImportLink(productId, supplier.id) &&
    supplier.addExportLink(productId, consumer.id);

  if (!linked) {
    consumer.removeImportLink(productId, supplier.id);
    supplier.removeExportLink(productId, consumer.id);
  }

  actions.recipes.recalculate();
};
