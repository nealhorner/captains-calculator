import { Action } from 'state/_types';
import { isExportedGraph } from '../importExport';
import logger from 'utils/logger';

export const loadGraphState: Action = ({ actions, effects }) => {
  const saved = effects.recipes.loadGraphState();
  if (!saved) return;

  if (!isExportedGraph(saved)) {
    logger('Ignoring persisted production graph in an unrecognised format', saved, 'warn');
    return;
  }

  const result = actions.recipes.restoreGraph({ nodes: saved.nodes, targets: saved.targets });

  if (result.errors.length) {
    logger('Restored the persisted production graph with issues', result.errors, 'warn');
  }
};
