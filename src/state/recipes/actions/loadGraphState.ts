import { showNotification } from '@mantine/notifications';

import { Action } from 'state/_types';
import { isExportedGraph } from '../importExport';
import logger from 'utils/logger';

export const loadGraphState: Action = ({ actions, effects }) => {
  const saved = effects.recipes.loadGraphState();
  if (!saved) return;

  if (!isExportedGraph(saved)) {
    // Tell the user rather than dropping their chain in silence.
    logger('Ignoring persisted production graph in an unrecognised format', saved, 'warn');
    showNotification({
      color: 'orange',
      title: 'Saved Chain Not Restored',
      message:
        'Your previously saved production chain was in an older format and could not be loaded.',
    });
    return;
  }

  const result = actions.recipes.restoreGraph({ nodes: saved.nodes, targets: saved.targets });

  if (result.errors.length) {
    logger('Restored the persisted production graph with issues', result.errors, 'warn');
    showNotification({
      color: 'orange',
      title: 'Saved Chain Partially Restored',
      message: result.errors[0],
    });
  }
};
