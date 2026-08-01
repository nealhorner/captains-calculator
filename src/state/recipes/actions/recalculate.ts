import { Action, ChainTarget } from 'state/_types';
import { dictValues } from 'utils/objects';
import ProductionNode from '../ProductionNode';
import { SolverDemand, solveChain } from '../solver';

/**
 * Re-sizes the whole chain from the current set of targets, then persists it.
 *
 * This is a full recompute rather than an incremental patch: a supplier shared
 * between several consumers is sized from their combined demand, so adding,
 * resizing or removing any one consumer changes it. Call this after any change
 * to targets, links, or a pinned building count.
 *
 * Saving happens here because every mutation path already ends in a recalculate,
 * which makes this the one place that cannot be forgotten.
 */
export const recalculate: Action = ({ state, actions }) => {
  const nodes = dictValues<ProductionNode>(state.recipes.nodes);

  if (nodes.length) {
    const demands: SolverDemand[] = [];

    dictValues<ChainTarget>(state.recipes.targets).forEach((target) => {
      if (!target.nodeId || !target.productId) return;
      if (!state.recipes.nodes[target.nodeId]) return;
      demands.push({
        nodeId: target.nodeId,
        productId: target.productId,
        quantity: target.quantity,
      });
    });

    const result = solveChain(
      nodes.map((node) => node.toSolverNode()),
      demands,
    );

    nodes.forEach((node) => node.applySolution(result.nodes[node.id]));
  }

  // Persist even when the graph is empty, so removing the last target clears
  // the saved copy rather than leaving a stale one behind.
  actions.recipes.saveGraphState();
};
