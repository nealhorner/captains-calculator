import { Category, Machine, Product, Recipe, RecipeProduct } from 'state/app/effects';
import ProductionNode from './ProductionNode';

export const makeProduct = (id: string, name = id): Product => ({
  id: id as Product['id'],
  name,
  icon: `${id}.png`,
  recipes: { input: [], output: [] },
  machines: { input: [], output: [] },
});

export const makeCategory = (id: string): Category => ({
  id: id as Category['id'],
  name: id,
  machines: [],
  recipes: [],
});

export const makeMachine = (id: string, categoryId: string): Machine => ({
  id: id as Machine['id'],
  game_id: id,
  icon: `${id}.png`,
  name: id,
  category_id: categoryId as Machine['category_id'],
  category_name: categoryId,
  workers: 1,
  maintenance_cost_units: 'basic',
  maintenance_cost_quantity: 0,
  electricity_consumed: 0,
  electricity_generated: 0,
  computing_consumed: 0,
  computing_generated: 0,
  storage_capacity: 0,
  unity_cost: 0,
  research_speed: 0,
  build_costs: [],
  recipes: [],
  isMine: false,
  isStorage: false,
  isFarm: false,
  products: { input: [], output: [] },
});

export const makeRecipe = (
  id: string,
  machineId: string,
  inputs: RecipeProduct[],
  outputs: RecipeProduct[],
): Recipe => ({
  id: id as Recipe['id'],
  name: id,
  machine: machineId as Machine['id'],
  duration: 60,
  inputs,
  outputs,
});

type WorldNode = {
  recipe: Recipe;
  machine: Machine;
  category: Category;
};

/**
 * A two-step world: a smelter producing molten_steel feeding a caster that
 * makes steel. Mirrors the shape of a real user-built chain.
 */
export const buildTestWorld = () => {
  const moltenSteel = makeProduct('molten_steel', 'Molten Steel');
  const steel = makeProduct('steel', 'Steel');

  const metalCategory = makeCategory('metal');

  const smelter = makeMachine('smelter', 'metal');
  const caster = makeMachine('caster', 'metal');

  const smeltRecipe = makeRecipe(
    'smelt_steel',
    'smelter',
    [],
    [{ id: moltenSteel.id, name: moltenSteel.name, quantity: 12 }],
  );
  const castRecipe = makeRecipe(
    'cast_steel',
    'caster',
    [{ id: moltenSteel.id, name: moltenSteel.name, quantity: 12 }],
    [{ id: steel.id, name: steel.name, quantity: 12 }],
  );

  const products = { [moltenSteel.id]: moltenSteel, [steel.id]: steel };
  const machines = { [smelter.id]: smelter, [caster.id]: caster };
  const categories = { [metalCategory.id]: metalCategory };
  const recipes = { [smeltRecipe.id]: smeltRecipe, [castRecipe.id]: castRecipe };

  const makeNodeFor = ({ recipe, machine, category }: WorldNode): ProductionNode => {
    const inputs = recipe.inputs.map(({ id, quantity }) => ({ ...products[id], quantity }));
    const outputs = recipe.outputs.map(({ id, quantity }) => ({ ...products[id], quantity }));
    return new ProductionNode({
      recipe,
      machine,
      category,
      inputs,
      outputs,
      sources: {},
      targets: {},
    });
  };

  const smelterNode = makeNodeFor({
    recipe: smeltRecipe,
    machine: smelter,
    category: metalCategory,
  });
  const casterNode = makeNodeFor({ recipe: castRecipe, machine: caster, category: metalCategory });

  // Link them: caster imports molten_steel from smelter. Links carry topology
  // only — the solver assigns the flow quantities.
  casterNode.addImportLink(moltenSteel.id, smelterNode.id);
  smelterNode.addExportLink(moltenSteel.id, casterNode.id);

  return {
    products,
    machines,
    categories,
    recipes,
    smelterNode,
    casterNode,
  };
};
