import logger from 'utils/logger';

export const loadGraphState = (): unknown => {
  const graph = localStorage.getItem('production-graph');
  if (!graph) return null;
  try {
    return JSON.parse(graph);
  } catch (error) {
    logger('Failed to parse persisted production graph, ignoring', error, 'warn');
    return null;
  }
};
