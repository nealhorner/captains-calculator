import { ExportedGraph } from '../importExport';
import logger from 'utils/logger';

/**
 * Every recalculate persists, and a recalculate runs on each keystroke in a
 * volume or building-count field. Serialising the whole graph and writing it
 * synchronously that often would stutter typing, so writes are coalesced onto
 * the trailing edge.
 */
const WRITE_DELAY_MS = 250;

let pending: ReturnType<typeof setTimeout> | null = null;

const write = (graph: ExportedGraph): void => {
  try {
    localStorage.setItem('production-graph', JSON.stringify(graph));
  } catch (error) {
    logger('Failed to persist production graph', error, 'warn');
  }
};

export const saveGraphState = (graph: ExportedGraph): void => {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    write(graph);
  }, WRITE_DELAY_MS);
};
