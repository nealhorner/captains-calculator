import React from 'react';
import { Box, Group, Select, Image, Tooltip, Indicator, Text, OptionsFilter } from '@mantine/core';
import { useAppState, useActions } from '../../state/index';
import { Machine, Recipe, RecipeId } from '../../state/app/effects/loadJsonData';
import { Icon } from '@iconify/react';
import productFlowClasses from 'components/ui/ProductFlowRow.module.css';

const SelectItem: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const products = useAppState((state) => state.products.items);
  let recipeInputs = recipe.inputs.map((p) => {
    return {
      ...products[p.id],
      quantity: p.quantity,
    };
  });
  let recipeOutputs = recipe.outputs.map((p) => {
    return {
      ...products[p.id],
      quantity: p.quantity,
    };
  });
  return (
    <Group gap="xs" wrap="nowrap">
      <Group wrap="nowrap" gap="xs" className={productFlowClasses.row}>
        {recipeInputs.map((product) => {
          return (
            <Group className="product-input" gap="xs" key={`input_${product.id}`} wrap="nowrap">
              <Tooltip label={product.name} withArrow color="green" withinPortal>
                <Indicator
                  label={product.quantity}
                  color="green"
                  radius="xs"
                  styles={{
                    indicator: {
                      fontSize: 11,
                      height: 'auto',
                      paddingRight: 5,
                      paddingLeft: 5,
                    },
                  }}
                  size={8}
                >
                  <Box
                    p={8}
                    style={(theme) => ({
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.gray[1]}`,
                      background: theme.colors.gray[7],
                    })}
                  >
                    <Image src={`/assets/products/${product.icon}`} height={22} width={22} />
                  </Box>
                </Indicator>
              </Tooltip>
              <Icon className="product-icon" icon="icomoon-free:plus" width={10} />
            </Group>
          );
        })}
      </Group>
      <Group gap="xs">
        <Icon className="results-icon" icon="icomoon-free:arrow-right" width={15} />
      </Group>
      <Group wrap="nowrap" gap="xs" className={productFlowClasses.row}>
        {recipeOutputs.map((product) => {
          return (
            <Group className="product-output" gap="xs" key={`output_${product.id}`} wrap="nowrap">
              <Tooltip label={product.name} withArrow color="red" withinPortal>
                <Indicator
                  label={product.quantity}
                  color="red"
                  radius="xs"
                  styles={{
                    indicator: {
                      fontSize: 11,
                      height: 'auto',
                      paddingRight: 5,
                      paddingLeft: 5,
                    },
                  }}
                  size={8}
                >
                  <Box
                    p={8}
                    style={(theme) => ({
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.gray[1]}`,
                      background: theme.colors.gray[7],
                    })}
                  >
                    <Image src={`/assets/products/${product.icon}`} height={26} width={26} />
                  </Box>
                </Indicator>
              </Tooltip>
              <Icon className="product-icon" icon="icomoon-free:plus" width={10} />
            </Group>
          );
        })}
      </Group>
    </Group>
  );
};

const SelectItemWithMachine: React.FC<{ recipe: Recipe; machine: Machine | null }> = ({
  recipe,
  machine,
}) => {
  const products = useAppState((state) => state.products.items);
  let recipeInputs = recipe.inputs.map((p) => {
    return {
      ...products[p.id],
      quantity: p.quantity,
    };
  });
  let recipeOutputs = recipe.outputs.map((p) => {
    return {
      ...products[p.id],
      quantity: p.quantity,
    };
  });
  return (
    <Group gap="xs" wrap="nowrap">
      <Group gap="xs">
        {machine ? (
          <React.Fragment>
            <Box
              p={5}
              style={(theme) => ({
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.gray[2]}`,
                background: theme.colors.gray[0],
              })}
            >
              <Image
                height={35}
                radius="md"
                src={`/assets/buildings/${machine.icon}`}
                alt={machine.name}
              />
            </Box>
            <Box>
              <Text fw={500} size="md" style={{ lineHeight: '1em' }}>
                {machine.name}
              </Text>
            </Box>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Box
              p={5}
              style={(theme) => ({
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.gray[2]}`,
                background: theme.colors.gray[0],
              })}
            >
              <Image
                height={35}
                radius="md"
                src={`/assets/buildings/Placeholder.png`}
                alt={recipe.name}
              />
            </Box>
            <Box>
              <Text fw={500} size="md" style={{ lineHeight: '1em' }}>
                {recipe.name}
              </Text>
            </Box>
          </React.Fragment>
        )}
      </Group>
      <Group wrap="nowrap" gap="xs" className={productFlowClasses.row}>
        {recipeInputs.map((product) => {
          return (
            <Group className="product-input" gap="xs" key={`input_${product.id}`} wrap="nowrap">
              <Tooltip label={product.name} withArrow color="green" withinPortal>
                <Indicator
                  label={product.quantity}
                  color="green"
                  radius="xs"
                  styles={{
                    indicator: {
                      fontSize: 11,
                      height: 'auto',
                      paddingRight: 5,
                      paddingLeft: 5,
                    },
                  }}
                  size={5}
                >
                  <Box
                    p={8}
                    style={(theme) => ({
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.gray[1]}`,
                      background: theme.colors.gray[7],
                    })}
                  >
                    <Image src={`/assets/products/${product.icon}`} height={18} width={18} />
                  </Box>
                </Indicator>
              </Tooltip>
              <Icon className="product-icon" icon="icomoon-free:plus" width={10} />
            </Group>
          );
        })}
      </Group>
      <Group gap="xs">
        <Icon className="results-icon" icon="icomoon-free:arrow-right" width={15} />
      </Group>
      <Group wrap="nowrap" gap="xs" className={productFlowClasses.row}>
        {recipeOutputs.map((product) => {
          return (
            <Group className="product-output" gap="xs" key={`output_${product.id}`} wrap="nowrap">
              <Tooltip label={product.name} withArrow color="red" withinPortal>
                <Indicator
                  label={product.quantity}
                  color="red"
                  radius="xs"
                  styles={{
                    indicator: {
                      fontSize: 11,
                      height: 'auto',
                      paddingRight: 5,
                      paddingLeft: 5,
                    },
                  }}
                  size={8}
                >
                  <Box
                    p={8}
                    style={(theme) => ({
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.gray[1]}`,
                      background: theme.colors.gray[7],
                    })}
                  >
                    <Image src={`/assets/products/${product.icon}`} height={18} width={18} />
                  </Box>
                </Indicator>
              </Tooltip>
              <Icon className="product-icon" icon="icomoon-free:plus" width={10} />
            </Group>
          );
        })}
      </Group>
    </Group>
  );
};

const labelFilter: OptionsFilter = ({ options, search }) =>
  options.filter(
    (option) =>
      'label' in option && option.label.toLowerCase().includes(search.toLowerCase().trim()),
  );

export const MachineRecipeSelect = () => {
  const currentProduct = useAppState((state) => state.products.currentItem);
  const currentMachine = useAppState((state) => state.machines.currentItem);
  const { itemsList: allRecipes, currentItemId } = useAppState((state) => state.recipes);
  const setCurrentRecipe = useActions().recipes.setCurrentRecipe;
  const selectRecipesItem = useActions().recipes.selectRecipesItem;
  const onChange = (recipeId: string | null) => {
    if (!recipeId) return;
    setCurrentRecipe(recipeId as RecipeId);
    selectRecipesItem(recipeId as RecipeId);
  };
  if (!currentMachine || !currentProduct) return null;
  let filteredRecipes = allRecipes.filter((recipe) => {
    return (
      currentMachine.recipes.indexOf(recipe.id as RecipeId) >= 0 &&
      recipe.outputs.find((product) => product.id === currentProduct.id)
    );
  });
  const recipesById = new Map(filteredRecipes.map((r) => [r.id, r]));
  return (
    <Select
      size="md"
      value={currentItemId}
      onChange={onChange}
      label="3. Select Recipe"
      placeholder="Make Selection..."
      renderOption={({ option }) => {
        const recipe = recipesById.get(option.value as RecipeId);
        return recipe ? <SelectItem recipe={recipe} /> : option.label;
      }}
      data={filteredRecipes.map((r) => ({
        label: r.name,
        value: r.id,
      }))}
      searchable
      maxDropdownHeight={400}
      nothingFoundMessage="No Match Found"
      filter={labelFilter}
    />
  );
};

type RecipeSelectControlledProps = {
  label: string;
  recipes: Recipe[];
  onSelect(recipeId: RecipeId): void;
};

export const RecipeSelectControlled: React.FC<RecipeSelectControlledProps> = ({
  recipes,
  onSelect,
  label,
}) => {
  const { items: allMachines } = useAppState((state) => state.machines);
  const [selectedId, selectId] = React.useState<RecipeId | null>(null);

  const onChange = (recipeId: string | null) => {
    if (!recipeId) return;
    selectId(recipeId as RecipeId);
    onSelect(recipeId as RecipeId);
  };

  const recipesById = new Map(recipes.map((r) => [r.id, r]));

  return (
    <Select
      size="sm"
      value={selectedId}
      onChange={onChange}
      placeholder={`Select Source For ${label} Input`}
      renderOption={({ option }) => {
        const recipe = recipesById.get(option.value as RecipeId);
        return recipe ? (
          <SelectItemWithMachine recipe={recipe} machine={allMachines[recipe.machine]} />
        ) : (
          option.label
        );
      }}
      data={recipes.map((r) => ({
        label: `${r.name} [${allMachines[r.machine].name}]`,
        value: r.id,
      }))}
      searchable
      maxDropdownHeight={400}
      nothingFoundMessage="No Match Found"
      filter={labelFilter}
    />
  );
};
