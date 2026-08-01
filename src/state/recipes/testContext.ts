import { Category, Machine, Product, Recipe } from 'state/app/effects';
import ProductionNode from './ProductionNode';
import { ChainTarget } from 'state/_types';

import { createProductionNode } from './actions/createProductionNode';
import { findReusableNode } from './actions/findReusableNode';
import { linkRecipe } from './actions/linkRecipe';
import { linkExistingRecipe } from './actions/linkExistingRecipe';
import { recalculate } from './actions/recalculate';
import { restoreGraph } from './actions/restoreGraph';
import { deleteNode } from './actions/deleteNode';
import { exportGraph } from './actions/exportGraph';
import { importGraph } from './actions/importGraph';
import { saveGraphState } from './actions/saveGraphState';
import { loadGraphState } from './actions/loadGraphState';
import {
  createTarget,
  setActiveTarget,
  setTargetProduct,
  setTargetMachine,
  setTargetRecipe,
  setTargetQuantity,
  removeTarget,
  releaseTargetNode,
  pruneOrphanNodes,
  setNodeMachinesCount,
} from './actions/targets';

type World = {
  products: { [id: string]: Product };
  machines: { [id: string]: Machine };
  categories: { [id: string]: Category };
  recipes: { [id: string]: Recipe };
};

/**
 * A working Overmind-shaped context with the real actions wired to each other.
 *
 * The action layer is now a set of collaborating actions — linking delegates to
 * merge detection and to the solver — so stubbing each one individually would
 * test the stubs rather than the behaviour. This binds the genuine
 * implementations to a plain state object instead.
 */
export const buildTestContext = (world: World) => {
  const savedGraphs: unknown[] = [];
  let storedGraph: unknown = null;

  const state = {
    recipes: {
      items: world.recipes,
      nodes: {} as { [id: string]: ProductionNode },
      targets: {} as { [id: string]: ChainTarget },
      activeTargetId: null as string | null,
      get nodesList() {
        return Object.values(this.nodes);
      },
      get targetsList() {
        return Object.values(this.targets);
      },
      get activeTarget() {
        return this.activeTargetId ? (this.targets[this.activeTargetId] ?? null) : null;
      },
    },
    machines: { items: world.machines },
    categories: { items: world.categories },
    products: { items: world.products },
  };

  const effects = {
    recipes: {
      saveGraphState: (graph: unknown) => {
        storedGraph = graph;
        savedGraphs.push(graph);
      },
      loadGraphState: () => storedGraph,
    },
  };

  const context: any = { state, effects };
  const bind = (action: any) => (payload?: any) => action(context, payload);

  context.actions = {
    recipes: {
      getInputSources: () => ({}),
      getOutputTargets: () => ({}),
      createProductionNode: bind(createProductionNode),
      findReusableNode: bind(findReusableNode),
      linkRecipe: bind(linkRecipe),
      linkExistingRecipe: bind(linkExistingRecipe),
      recalculate: bind(recalculate),
      restoreGraph: bind(restoreGraph),
      deleteNode: bind(deleteNode),
      exportGraph: bind(exportGraph),
      importGraph: bind(importGraph),
      saveGraphState: bind(saveGraphState),
      loadGraphState: bind(loadGraphState),
      createTarget: bind(createTarget),
      setActiveTarget: bind(setActiveTarget),
      setTargetProduct: bind(setTargetProduct),
      setTargetMachine: bind(setTargetMachine),
      setTargetRecipe: bind(setTargetRecipe),
      setTargetQuantity: bind(setTargetQuantity),
      removeTarget: bind(removeTarget),
      releaseTargetNode: bind(releaseTargetNode),
      pruneOrphanNodes: bind(pruneOrphanNodes),
      setNodeMachinesCount: bind(setNodeMachinesCount),
    },
  };

  return {
    context,
    state,
    actions: context.actions.recipes,
    savedGraphs,
    getStoredGraph: () => storedGraph,
    setStoredGraph: (graph: unknown) => {
      storedGraph = graph;
    },
  };
};
