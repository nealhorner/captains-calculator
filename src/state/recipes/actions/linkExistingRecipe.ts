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

  // Roll back only what this call created. A failed add can simply mean the
  // link already existed, and removing it then would destroy a link the graph
  // legitimately had.
  let addedImport = consumer.addImportLink(productId, supplier.id);
  let addedExport = addedImport && supplier.addExportLink(productId, consumer.id);

  if (!addedImport || !addedExport) {
    if (addedImport) consumer.removeImportLink(productId, supplier.id);
    if (addedExport) supplier.removeExportLink(productId, consumer.id);
  }

  actions.recipes.recalculate();
};
