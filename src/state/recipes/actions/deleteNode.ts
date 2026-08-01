import { AsyncAction, ChainTarget } from 'state/_types';
import { dictValues } from 'utils/objects';
import ProductionNode from '../ProductionNode';

/**
 * Removes a node from the graph.
 *
 * Surviving nodes just drop their links to it — there is no need to re-balance
 * anything by hand, because `recalculate` re-sizes the whole chain from the
 * remaining topology.
 */
export const deleteNode: AsyncAction<string> = async ({ state, actions }, nodeId) => {
  if (!state.recipes.nodes[nodeId]) return;

  dictValues<ProductionNode>(state.recipes.nodes).forEach((node) => {
    if (node.id === nodeId) return;
    node.removeLinksTo(nodeId);
  });

  let remainingNodes: { [index: string]: ProductionNode } = {};

  Object.keys(state.recipes.nodes).forEach((nodeKey) => {
    if (nodeKey !== nodeId) {
      remainingNodes[nodeKey] = state.recipes.nodes[nodeKey];
    }
  });

  state.recipes.nodes = remainingNodes;

  // A target whose root node has just been deleted no longer describes anything.
  dictValues<ChainTarget>(state.recipes.targets).forEach((target) => {
    if (target.nodeId === nodeId) {
      actions.recipes.removeTarget(target.id);
    }
  });

  actions.recipes.recalculate();
};
