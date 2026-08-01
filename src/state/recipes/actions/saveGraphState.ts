import { Action } from 'state/_types';
import { buildExportedGraph } from '../importExport';

export const saveGraphState: Action = ({ state, effects }) => {
  effects.recipes.saveGraphState(
    buildExportedGraph(state.recipes.nodesList, state.recipes.targetsList),
  );
};
