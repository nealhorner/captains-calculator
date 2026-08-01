import { Action } from 'state/_types';
import { RecipeId } from 'state/app/effects/loadJsonData';
import ProductionNode, { RecipeIOExportProduct } from '../ProductionNode';
import { dictValues } from 'utils/objects';

type FindReusableNodeParams = {
  recipeId: RecipeId;
  /** The node that would consume from (or supply to) the reused node, if any. */
  consumerNodeId?: string | null;
};

/**
 * Finds an existing node running `recipeId` that can be reused instead of adding
 * a duplicate, so two chains needing the same intermediate share one supplier.
 *
 * A candidate downstream of the consumer is rejected: reusing it would feed the
 * consumer from something it already supplies, manufacturing a cycle.
 */
export const findReusableNode: Action<FindReusableNodeParams, string | null> = (
  { state },
  { recipeId, consumerNodeId },
) => {
  let candidates = dictValues<ProductionNode>(state.recipes.nodes).filter((node) => {
    return node.recipe.id === recipeId && node.id !== consumerNodeId;
  });

  if (!candidates.length) return null;
  if (!consumerNodeId) return candidates[0].id;

  // Everything reachable by following exports from the consumer.
  let downstream = new Set<string>();
  let queue = [consumerNodeId];

  while (queue.length) {
    let nodeId = queue.shift()!;
    let node = state.recipes.nodes[nodeId];
    if (!node) continue;
    dictValues<RecipeIOExportProduct>(node.outputs).forEach((output) => {
      output.exports.forEach(({ target }: { target: string }) => {
        if (downstream.has(target)) return;
        downstream.add(target);
        queue.push(target);
      });
    });
  }

  let safe = candidates.find((candidate) => !downstream.has(candidate.id));

  return safe ? safe.id : null;
};
