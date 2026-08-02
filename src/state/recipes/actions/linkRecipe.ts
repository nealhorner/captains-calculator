import { AsyncAction } from 'state/_types';
import { ProductId, RecipeId } from '../../app/effects/loadJsonData';

export type LinkRecipeParams = {
  currentNodeId: string;
  newNodeId: RecipeId;
  productId: ProductId;
  direction: 'input' | 'output';
};

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
export const linkRecipe: AsyncAction<LinkRecipeParams> = async (
  { state, actions },
  { currentNodeId, newNodeId, productId, direction },
) => {
  let currentNode = state.recipes.nodes[currentNodeId];
  if (!currentNode) return;

  let reusable = actions.recipes.findReusableNode({
    recipeId: newNodeId,
    anchorNodeId: currentNodeId,
    direction,
  });

  if (reusable) {
    await actions.recipes.linkExistingRecipe({
      currentNodeId,
      existingNodeId: reusable,
      productId,
      direction,
    });
    return;
  }

  let newNode = actions.recipes.createProductionNode({ recipeId: newNodeId });

  // A link has to exist on both sides. Only the import side draws edges and
  // carries demand, while only the export side keeps a node reachable when
  // pruning — so half a link would leave either an unmet demand or an
  // invisible node that survives cleanup.
  let consumer = direction === 'input' ? currentNode : newNode;
  let supplier = direction === 'input' ? newNode : currentNode;

  // Both sides or neither. Roll back only what this call created: a failed add
  // can mean the link already existed, and removing it would destroy a link the
  // graph legitimately had.
  let addedImport = consumer.addImportLink(productId, supplier.id);
  let addedExport = addedImport && supplier.addExportLink(productId, consumer.id);

  if (!addedImport || !addedExport) {
    if (addedImport) consumer.removeImportLink(productId, supplier.id);
    if (addedExport) supplier.removeExportLink(productId, consumer.id);
    actions.recipes.pruneOrphanNodes();
    actions.recipes.recalculate();
    return;
  }

  actions.recipes.recalculate();
};
