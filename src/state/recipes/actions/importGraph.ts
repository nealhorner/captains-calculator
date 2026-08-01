import { Action } from 'state/_types';
import { isExportedGraph } from '../importExport';
import { RestoreGraphResult } from './restoreGraph';

export type ImportGraphResult = RestoreGraphResult;

export const importGraph: Action<unknown, ImportGraphResult> = ({ actions }, data) => {
  if (!isExportedGraph(data)) {
    return {
      imported: 0,
      skipped: 0,
      errors: ["File is not a valid Captain's Calculator export."],
    };
  }

  return actions.recipes.restoreGraph({ nodes: data.nodes, targets: data.targets });
};
