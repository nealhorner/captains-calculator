import { Action } from 'state/_types';
import ProductionNode from '../ProductionNode';
import logger from 'utils/logger';

export const loadGraphState: Action = ({ state, effects }) => {
  let savedNodes = effects.recipes.loadGraphState();
  if (savedNodes) {
    let nodes: { [key: string]: ProductionNode } = {};
    savedNodes.forEach((data) => {
      try {
        let node = ProductionNode.fromJSON(data);
        nodes[node.id] = node;
      } catch (error) {
        logger('Skipping invalid persisted production node', error, 'warn');
      }
    });
    state.recipes.nodes = nodes;
  }
};
