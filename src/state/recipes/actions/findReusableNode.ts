import { Action } from 'state/_types';
import { RecipeId } from 'state/app/effects/loadJsonData';
import ProductionNode, { RecipeIOExportProduct, RecipeIOImportProduct } from '../ProductionNode';
import { dictValues } from 'utils/objects';

type FindReusableNodeParams = {
  recipeId: RecipeId;
  /** The node the reused one would be linked to, if any. */
  anchorNodeId?: string | null;
  /**
   * Which side the reused node sits on relative to the anchor: 'input' when it
   * would supply the anchor, 'output' when it would consume from it.
   */
  direction?: 'input' | 'output';
};

/**
 * Finds an existing node running `recipeId` that can be reused instead of adding
 * a duplicate, so two chains needing the same intermediate share one supplier.
 *
 * A candidate on the wrong side of the anchor is rejected, because reusing it
 * would close a loop. Which side is "wrong" depends on the direction of the
 * link: a new supplier must not already be downstream of the anchor, and a new
 * consumer must not already be upstream of it.
 */
export const findReusableNode: Action<FindReusableNodeParams, string | null> = (
  { state },
  { recipeId, anchorNodeId, direction = 'input' },
) => {
  let candidates = dictValues<ProductionNode>(state.recipes.nodes).filter((node) => {
    return node.recipe.id === recipeId && node.id !== anchorNodeId;
  });

  if (!candidates.length) return null;
  if (!anchorNodeId) return candidates[0].id;

  // Walk away from the anchor in the direction the new link would flow back
  // from: exports when the reused node feeds the anchor, imports when it is fed
  // by it.
  let seen = new Set<string>();
  let queue = [anchorNodeId];

  while (queue.length) {
    let nodeId = queue.shift()!;
    let node = state.recipes.nodes[nodeId];
    if (!node) continue;

    let neighbours: string[] = [];

    if (direction === 'input') {
      dictValues<RecipeIOExportProduct>(node.outputs).forEach((output) => {
        output.exports.forEach(({ target }: { target: string }) => neighbours.push(target));
      });
    } else {
      dictValues<RecipeIOImportProduct>(node.inputs).forEach((input) => {
        input.imports.forEach(({ source }: { source: string }) => neighbours.push(source));
      });
    }

    neighbours.forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      queue.push(id);
    });
  }

  let safe = candidates.find((candidate) => !seen.has(candidate.id));

  return safe ? safe.id : null;
};
