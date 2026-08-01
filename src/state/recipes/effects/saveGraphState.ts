import ProductionNode from '../ProductionNode';
import logger from 'utils/logger';

export const saveGraphState = (nodes: { [key: string]: ProductionNode }): void => {
  try {
    localStorage.setItem('production-graph', JSON.stringify(Object.values(nodes)));
  } catch (error) {
    logger('Failed to persist production graph', error, 'warn');
  }
};
