import { ProductId, Recipe, RecipeId } from 'state/app/effects/loadJsonData';
import ProductionNode from './ProductionNode';
import { Edge } from '@xyflow/react';
import { RecipeNode } from 'components/calculator/Editor';

export type RecipesState = {
  itemsList: Recipe[];
  items: {
    [key: string]: Recipe;
  };
  currentItemId: Recipe['id'] | null;
  currentItem: Recipe | null;
  selectedRecipeIds: RecipeId[];
  selectedRecipies: Recipe[];
  nodes: {
    [key: string]: ProductionNode;
  };
  currentNodeId: RecipeId | null;
  currentNode: ProductionNode | null;
  nodesList: ProductionNode[];
  nodesData: RecipeNode[];
  edgesData: Edge<any>[];
  graphData: RecipeNode[];
};

export type ProductRecipes = {
  [index in ProductId]: Recipe[];
};
