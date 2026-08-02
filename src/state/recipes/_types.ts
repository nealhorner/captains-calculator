import { MachineId, ProductId, Recipe, RecipeId } from 'state/app/effects/loadJsonData';
import ProductionNode from './ProductionNode';
import { Edge } from '@xyflow/react';
import { RecipeNode } from 'components/calculator/Editor';

/**
 * One product the user wants the factory to produce, and how much of it per 60
 * seconds. The chain is sized so that every target is met.
 */
export type ChainTarget = {
  id: string;
  productId: ProductId | null;
  machineId: MachineId | null;
  recipeId: RecipeId | null;
  /** Desired output volume per 60 seconds. */
  quantity: number;
  /** The production node serving this target, once a recipe has been chosen. */
  nodeId: string | null;
};

export type RecipesState = {
  itemsList: Recipe[];
  items: {
    [key: string]: Recipe;
  };
  currentItemId: Recipe['id'] | null;
  currentItem: Recipe | null;
  /**
   * A plain browse selection used by the (currently unrouted) Products, Recipes
   * and Home screens. Unrelated to the calculator graph.
   */
  selectedRecipeIds: RecipeId[];
  selectedRecipies: Recipe[];
  targets: {
    [key: string]: ChainTarget;
  };
  targetsList: ChainTarget[];
  /** The target the setup drawers are currently building up or editing. */
  activeTargetId: string | null;
  activeTarget: ChainTarget | null;
  nodes: {
    [key: string]: ProductionNode;
  };
  nodesList: ProductionNode[];
  nodesData: RecipeNode[];
  edgesData: Edge<any>[];
};

export type ProductRecipes = {
  [index in ProductId]: Recipe[];
};
