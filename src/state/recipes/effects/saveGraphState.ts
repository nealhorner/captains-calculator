import { ExportedGraph } from '../importExport';
import logger from 'utils/logger';

export const saveGraphState = (graph: ExportedGraph): void => {
  try {
    localStorage.setItem('production-graph', JSON.stringify(graph));
  } catch (error) {
    logger('Failed to persist production graph', error, 'warn');
  }
};
