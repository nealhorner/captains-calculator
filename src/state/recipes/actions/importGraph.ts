import { Action } from 'state/_types';
import { isExportedGraph } from '../importExport';
import { RestoreGraphResult } from './restoreGraph';

export type ImportGraphResult = RestoreGraphResult;

/**
 * Parsed-JSON shape for imported data. Deliberately not `unknown`: Overmind's
 * action-binding types treat a bare `unknown` payload as structurally
 * assignable to `void` (an unknown-accepting function is a supertype of a
 * void-accepting one), which collapses the bound action to a zero-arg
 * function and breaks call sites like `actions.importGraph(data)`.
 */
export type UnknownJson = string | number | boolean | null | { [key: string]: unknown } | unknown[];

export const importGraph: Action<UnknownJson, ImportGraphResult> = ({ actions }, data) => {
  if (!isExportedGraph(data)) {
    return {
      imported: 0,
      skipped: 0,
      errors: ["File is not a valid Captain's Calculator export."],
    };
  }

  return actions.recipes.restoreGraph({ nodes: data.nodes, targets: data.targets });
};
