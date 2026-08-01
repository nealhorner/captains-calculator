import { Action, ChainTarget } from 'state/_types';
import ProductionNode, { SerializedProductionNode, reserveNodeId } from '../ProductionNode';
import { ExportedTarget } from '../importExport';

export type RestoreGraphParams = {
  nodes: SerializedProductionNode[];
  targets: ExportedTarget[];
};

export type RestoreGraphResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

/**
 * Rebuilds a graph from serialized data, for both a pasted export file and the
 * copy held in localStorage.
 *
 * Only the user's choices are stored, so everything else is reconstructed here:
 * nodes are rebuilt from the current game data, links are re-established, and
 * the solver re-derives every rate. That means a file keeps working when the
 * game data changes underneath it, and a chain can never load in a state that
 * disagrees with its own targets.
 */
export const restoreGraph: Action<RestoreGraphParams, RestoreGraphResult> = (
  { state, actions },
  { nodes, targets },
) => {
  const errors: string[] = [];
  let skipped = 0;

  // A Map rather than a plain object so a node id colliding with an inherited
  // property name (e.g. "constructor") can't be mistaken for an existing entry.
  const rebuilt = new Map<string, ProductionNode>();

  nodes.forEach((serialized) => {
    if (rebuilt.has(serialized.id)) {
      skipped++;
      errors.push(`Skipped a duplicate node id "${serialized.id}".`);
      return;
    }

    const recipe = state.recipes.items[serialized.recipeId];

    if (!recipe) {
      skipped++;
      errors.push(
        `Skipped a node — recipe "${serialized.recipeId}" no longer exists in the current game data.`,
      );
      return;
    }

    const node = actions.recipes.createProductionNode({
      recipeId: serialized.recipeId,
      id: serialized.id,
    });

    node.pinnedMachinesCount = serialized.pinnedMachinesCount;
    rebuilt.set(node.id, node);
  });

  // Leave the existing chain alone rather than replacing it with an empty graph.
  if (rebuilt.size === 0) {
    return { imported: 0, skipped, errors };
  }

  // Re-establish links, dropping any that point at a node which did not survive.
  nodes.forEach((serialized) => {
    const node = rebuilt.get(serialized.id);
    if (!node) return;
    Object.keys(serialized.imports).forEach((productId) => {
      serialized.imports[productId].forEach((sourceId) => {
        const source = rebuilt.get(sourceId);
        if (!source) {
          errors.push(`Dropped a link from a node that could not be restored.`);
          return;
        }
        node.addImportLink(productId, sourceId);
        source.addExportLink(productId, serialized.id);
      });
    });
  });

  const restoredNodes: { [key: string]: ProductionNode } = {};
  rebuilt.forEach((node, id) => {
    restoredNodes[id] = node;
  });

  const restoredTargets: { [key: string]: ChainTarget } = {};
  targets.forEach((target) => {
    if (!rebuilt.has(target.nodeId)) {
      errors.push(`Dropped the target for "${target.productId}" — its node could not be restored.`);
      return;
    }
    restoredTargets[target.id] = {
      id: target.id,
      productId: target.productId,
      machineId: target.machineId,
      recipeId: target.recipeId,
      quantity: target.quantity,
      nodeId: target.nodeId,
    };
    reserveNodeId(target.id);
  });

  state.recipes.nodes = restoredNodes;
  state.recipes.targets = restoredTargets;
  state.recipes.activeTargetId = null;

  actions.recipes.recalculate();

  return { imported: rebuilt.size, skipped, errors };
};
