import { MachineId, ProductId, RecipeId } from 'state/app/effects/loadJsonData';
import ProductionNode, { SerializedProductionNode } from './ProductionNode';
import { ChainTarget } from 'state/_types';

export const EXPORT_FORMAT = 'captains-calculator';
export const EXPORT_FORMAT_VERSION = 1;

export type ExportedNode = SerializedProductionNode;

/**
 * A production goal. Targets are what the chain is sized from, so a file
 * without them would restore a graph that cannot be re-sized.
 */
export type ExportedTarget = {
  id: string;
  productId: ProductId;
  machineId: MachineId;
  recipeId: RecipeId;
  quantity: number;
  nodeId: string;
};

export type ExportedGraph = {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  nodes: ExportedNode[];
  targets: ExportedTarget[];
};

export const buildExportedGraph = (
  nodes: ProductionNode[],
  targets: ChainTarget[],
): ExportedGraph => ({
  format: EXPORT_FORMAT,
  version: EXPORT_FORMAT_VERSION,
  exportedAt: new Date().toISOString(),
  nodes: nodes.map((node) => node.toSerialized()),
  // Only fully-specified targets are worth writing out; a half-finished one has
  // no node to attach to on the way back in.
  targets: targets
    .filter((target) => target.productId && target.machineId && target.recipeId && target.nodeId)
    .map((target) => ({
      id: target.id,
      productId: target.productId as ProductId,
      machineId: target.machineId as MachineId,
      recipeId: target.recipeId as RecipeId,
      quantity: target.quantity,
      nodeId: target.nodeId as string,
    })),
});

/**
 * `typeof x === 'number'` also accepts NaN, Infinity and negatives. An imported
 * file is arbitrary input, and a NaN quantity would propagate through the solver
 * into every derived rate on screen.
 */
const isFiniteAmount = (value: any): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isExportedNode = (node: any): node is ExportedNode => {
  return (
    !!node &&
    typeof node === 'object' &&
    typeof node.id === 'string' &&
    typeof node.recipeId === 'string' &&
    (node.pinnedMachinesCount === null || isFiniteAmount(node.pinnedMachinesCount)) &&
    !!node.imports &&
    typeof node.imports === 'object' &&
    Object.values(node.imports).every(
      (sources) => Array.isArray(sources) && sources.every((s: any) => typeof s === 'string'),
    )
  );
};

const isExportedTarget = (target: any): target is ExportedTarget => {
  return (
    !!target &&
    typeof target === 'object' &&
    typeof target.id === 'string' &&
    typeof target.productId === 'string' &&
    typeof target.machineId === 'string' &&
    typeof target.recipeId === 'string' &&
    isFiniteAmount(target.quantity) &&
    typeof target.nodeId === 'string'
  );
};

export const isExportedGraph = (data: any): data is ExportedGraph => {
  return (
    !!data &&
    typeof data === 'object' &&
    data.format === EXPORT_FORMAT &&
    data.version === EXPORT_FORMAT_VERSION &&
    Array.isArray(data.nodes) &&
    data.nodes.every(isExportedNode) &&
    Array.isArray(data.targets) &&
    data.targets.every(isExportedTarget)
  );
};
