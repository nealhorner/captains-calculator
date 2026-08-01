import React from 'react';
import { Box, Grid, Divider, Card, Group, Stack, Text, Image, Tooltip, Table } from '@mantine/core';
import PageHeader from 'components/layout/page/PageHeader';
import PageLayout from 'components/layout/page/PageLayout';
import { ProductMachineSelect } from 'components/products/ProductMachineSelect';
import {
  MachineRecipeSelect,
  RecipeSelectControlled,
} from 'components/recipes/MachineRecipeSelect';
import { ProductSelect } from 'components/products/ProductSelect';
import { useActions, useAppState } from 'state';
import { Category, Machine, ProductId, Recipe, RecipeId } from 'state/app/effects';
import CostsIcon from 'components/ui/CostsIcons';
import productFlowClasses from 'components/ui/ProductFlowRow.module.css';
import NeedsBage, { needMap } from 'components/ui/NeedsBadge';
import ProductIcon from 'components/products/ProductIcon';
import { Icon } from '@iconify/react';
import CostsBadge from 'components/ui/CostsBadge';

const renderRecipeSource = (recipe: Recipe, machine: Machine, category: Category) => {
  return (
    <React.Fragment>
      <Group justify="space-between" align="center" p="xs">
        <Group gap={7}>
          <Tooltip label={category.name} withArrow withinPortal>
            <Box
              p={4}
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                background: theme.colors.dark[4],
              })}
            >
              <Image
                src={`/assets/categories/${category.id}.png`}
                alt={category.name}
                height={22}
              />
            </Box>
          </Tooltip>
          <Tooltip label={machine.name} withArrow withinPortal>
            <Box
              p={4}
              style={(theme) => ({
                borderRadius: theme.radius.sm,
                background: theme.colors.dark[4],
              })}
            >
              <Image
                height={22}
                radius="md"
                src={`/assets/buildings/${machine.icon}`}
                alt={machine.name}
              />
            </Box>
          </Tooltip>
          <Group gap={5}>
            <Text fw="bolder" size="lg" style={{ lineHeight: '1em' }}>
              {machine.name}
            </Text>
          </Group>
        </Group>
        <Group gap={4} align="center">
          {machine.build_costs.map((product, key) => {
            return <CostsBadge key={key} product={product} />;
          })}
          <NeedsBage need="workers" value={machine.workers} />
          {machine.maintenance_cost_units === 'maintenance_i' && (
            <NeedsBage need="maintenance1" value={machine.maintenance_cost_quantity} />
          )}
          {machine.maintenance_cost_units === 'maintenance_iI' && (
            <NeedsBage need="maintenance2" value={machine.maintenance_cost_quantity} />
          )}
          <NeedsBage need="electricity" value={machine.electricity_consumed} />
          <NeedsBage need="unity" value={machine.unity_cost} />
          <NeedsBage need="computing" value={machine.computing_consumed} suffix="tf" />
        </Group>
      </Group>

      <Divider
        my={0}
        variant="solid"
        labelPosition="center"
        color="gray"
        style={(theme) => ({ borderTopColor: theme.colors.gray[4] })}
      />

      <Box p="xs">
        <Group wrap="nowrap" justify="center">
          <Group
            wrap="nowrap"
            gap="xs"
            className={`${productFlowClasses.row} ${productFlowClasses.rowIconMargin}`}
          >
            {recipe.inputs.map((product, key) => {
              return (
                <Group className="product-input" gap="xs" key={`input_${product.id}`} wrap="nowrap">
                  <CostsIcon key={key} recipeId={recipe.id} product={product} color="red" />
                  <Icon className="product-icon" icon="icomoon-free:plus" width={10} />
                </Group>
              );
            })}
          </Group>
          <Group gap="xs">
            <Stack align="center" gap={5}>
              <Icon className="results-icon" icon="icomoon-free:arrow-right" width={15} />
              <Text
                fw="bold"
                size="sm"
                style={(theme) => ({
                  color: theme.colors.gray[6],
                  lineHeight: `${theme.fontSizes.sm}px`,
                })}
              >
                {recipe.duration}
                <small>/s</small>
              </Text>
            </Stack>
          </Group>
          <Group
            wrap="nowrap"
            gap="xs"
            className={`${productFlowClasses.row} ${productFlowClasses.rowIconMargin}`}
          >
            {recipe.outputs.map((product, key) => {
              return (
                <Group
                  className="product-output"
                  gap="xs"
                  key={`input_${product.id}`}
                  wrap="nowrap"
                >
                  <CostsIcon key={key} recipeId={recipe.id} product={product} color="red" />
                  <Icon className="product-icon" icon="icomoon-free:plus" width={10} />
                </Group>
              );
            })}
          </Group>
        </Group>
      </Box>
    </React.Fragment>
  );
};

const Home: React.FC = () => {
  const { items: allCategories } = useAppState((state) => state.categories);
  const { items: allProducts, currentItem: currentProduct } = useAppState(
    (state) => state.products,
  );
  const { items: allMachines, currentItem: currentMachine } = useAppState(
    (state) => state.machines,
  );
  const { items: allRecipes, currentItem: currentRecipe } = useAppState((state) => state.recipes);
  const { selectedRecipies } = useAppState((state) => state.recipes);

  const renderRecipeSelect = () => {
    if (!currentMachine) return null;
    return <MachineRecipeSelect />;
  };

  const renderProductSelect = () => {
    if (!currentProduct) return null;
    return <ProductMachineSelect />;
  };

  const getInputSources = (selectedRecipe: Recipe) => {
    return selectedRecipe.inputs.reduce(
      (inputRecipes, input) => {
        let product = allProducts[input.id];
        let recipeSources = product.recipes.output.length
          ? product.recipes.output.map((recipeId) => allRecipes[recipeId])
          : [];
        if (inputRecipes[input.id]) {
          return recipeSources.length
            ? { ...inputRecipes, [input.id]: [...inputRecipes[input.id], recipeSources] }
            : inputRecipes;
        } else {
          return recipeSources.length
            ? { ...inputRecipes, [input.id]: recipeSources }
            : inputRecipes;
        }
      },
      {} as { [index in ProductId]: Recipe[] },
    );
  };

  const renderRecipe = (recipe: Recipe) => {
    let machine = allMachines[recipe.machine];
    let sources: { [index in ProductId]: Recipe[] } = recipe
      ? getInputSources(recipe)
      : ({} as { [index in ProductId]: Recipe[] });
    return (
      <Card
        p={0}
        style={(theme) => ({
          border: `1px solid ${theme.colors.gray[4]}`,
        })}
      >
        {renderRecipeSource(recipe, machine, allCategories[machine.category_id])}
        {Object.keys(sources).length ? (
          <React.Fragment>
            <Divider
              my={0}
              variant="solid"
              labelPosition="center"
              color="gray"
              style={(theme) => ({ borderTopColor: theme.colors.gray[4] })}
            />
            <Box p="xs">
              <Stack gap={5}>
                {Object.keys(sources).map((inputId, key) => {
                  let inputSources = sources[inputId as ProductId];
                  let product = allProducts[inputId];
                  return (
                    <Box
                      key={key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: 5,
                      }}
                    >
                      <ProductIcon product={product} />
                      <RecipeSelect recipes={inputSources} label={product.name} />
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </React.Fragment>
        ) : null}
      </Card>
    );
  };

  return (
    <PageLayout header={<PageHeader title={`Welcome`} />}>
      <Grid columns={16}>
        <Grid.Col span={{ md: 11 }}>
          <Divider my="xs" label="Production Chain Setup" />

          <Stack gap="sm">
            <Grid>
              <Grid.Col span={{ md: 6 }}>
                <ProductSelect />
              </Grid.Col>
              <Grid.Col span={{ md: 6 }}>{renderProductSelect()}</Grid.Col>
              <Grid.Col span={{ md: 12 }}>{renderRecipeSelect()}</Grid.Col>
            </Grid>

            {currentRecipe && currentMachine ? (
              <Box>
                <Stack gap="sm">
                  {selectedRecipies.map((selectedRecipie, key) => {
                    return (
                      <React.Fragment key={key}>{renderRecipe(selectedRecipie)}</React.Fragment>
                    );
                  })}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ md: 5 }}>
          <Divider my="xs" label="Production Chain Summary" />

          {selectedRecipies.length ? (
            <ResultsSummary />
          ) : (
            <Card
              p="xs"
              style={(theme) => ({
                border: `1px solid ${theme.colors.gray[4]}`,
              })}
            >
              Select A Recipe To Calculate
            </Card>
          )}
        </Grid.Col>
      </Grid>
    </PageLayout>
  );
};

type RecipeSelectProps = {
  label: string;
  recipes: Recipe[];
};

const RecipeSelect: React.FC<RecipeSelectProps> = ({ recipes, label }) => {
  const selectRecipesItem = useActions().recipes.selectRecipesItem;

  const handleSelect = (recipeId: RecipeId) => {
    selectRecipesItem(recipeId);
  };

  return (
    <React.Fragment>
      {recipes.length ? (
        <RecipeSelectControlled recipes={recipes} onSelect={handleSelect} label={label} />
      ) : null}
    </React.Fragment>
  );
};

const ResultsSummary = () => {
  const { selectedRecipies } = useAppState((state) => state.recipes);
  const { items: allProducts } = useAppState((state) => state.products);
  const { items: allMachines } = useAppState((state) => state.machines);

  let needs: { [index: string]: { label: string; icon: string; total: number; color: string } } = {
    workers: {
      icon: needMap['workers'].icon,
      label: 'Workers',
      total: 0,
      color: needMap['workers'].color,
    },
    electricity: {
      icon: needMap['electricity'].icon,
      label: 'Electricity',
      total: 0,
      color: needMap['electricity'].color,
    },
    maintenance1: {
      icon: needMap['maintenance1'].icon,
      label: 'Maintenance I',
      total: 0,
      color: needMap['maintenance1'].color,
    },
    maintenance2: {
      icon: needMap['maintenance2'].icon,
      label: 'Maintenance II',
      total: 0,
      color: needMap['maintenance2'].color,
    },
    unity: {
      icon: needMap['unity'].icon,
      label: 'Unity',
      total: 0,
      color: needMap['unity'].color,
    },
    computing: {
      icon: needMap['computing'].icon,
      label: 'Computing',
      total: 0,
      color: needMap['computing'].color,
    },
  };

  let costs: { [index: string]: { label: string; icon: string; total: number } } = {};
  let buildings: { [index: string]: { id: string; label: string; icon: string; total: number } } =
    {};

  selectedRecipies.forEach((recipe) => {
    let machine = allMachines[recipe.machine];

    if (!buildings.hasOwnProperty(machine.id)) {
      buildings[machine.id] = {
        id: machine.id,
        label: machine.name,
        icon: machine.icon,
        total: 0,
      };
    }

    if (buildings.hasOwnProperty(machine.id)) {
      buildings[machine.id].total += 1;
    }

    // Needs

    needs.workers.total += machine.workers;
    needs.electricity.total += machine.electricity_consumed;
    if (machine.maintenance_cost_units === 'maintenance_i') {
      needs.maintenance1.total += machine.maintenance_cost_quantity;
    }
    if (machine.maintenance_cost_units === 'maintenance_ii') {
      needs.maintenance2.total += machine.maintenance_cost_quantity;
    }

    needs.unity.total += machine.unity_cost;
    needs.computing.total += machine.computing_consumed;

    // Costs
    machine.build_costs.forEach((product) => {
      let productData = allProducts[product.id];
      if (!costs.hasOwnProperty(product.id)) {
        costs[product.id] = {
          label: product.name,
          icon: productData.icon,
          total: 0,
        };
      }
      if (costs.hasOwnProperty(product.id)) {
        costs[product.id].total += product.quantity;
      }
    });
  });

  return (
    <Card
      p="xs"
      style={(theme) => ({
        border: `1px solid ${theme.colors.green[4]}`,
      })}
    >
      <Stack gap="xs">
        <Table horizontalSpacing={6} verticalSpacing={6}>
          <thead>
            <tr>
              <th colSpan={3}>Buildings</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(buildings).map((buildingId, k) => {
              let building = buildings[buildingId];
              if (building.total > 0) {
                return (
                  <tr key={`costs-${buildingId}-${k}`}>
                    <td className="fitwidth">
                      <Box
                        p={4}
                        style={(theme) => ({
                          borderRadius: theme.radius.sm,
                          border: `1px solid ${theme.colors.gray[4]}`,
                          background: theme.colors.dark[5],
                        })}
                      >
                        <Image
                          height={22}
                          width={22}
                          src={`/assets/buildings/${building.icon}`}
                          alt={building.label}
                          style={{ display: 'block', objectFit: 'contain' }}
                        />
                      </Box>
                    </td>
                    <td>{building.label}</td>
                    <td align="right">
                      x<strong>{building.total}</strong>
                    </td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </Table>

        <Table horizontalSpacing={6} verticalSpacing={6}>
          <thead>
            <tr>
              <th colSpan={3}>Construction Costs</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(costs).map((costId, k) => {
              let cost = costs[costId];
              if (cost.total > 0) {
                return (
                  <tr key={`costs-${costId}-${k}`}>
                    <td className="fitwidth">
                      <Box
                        p={6}
                        style={(theme) => ({
                          borderRadius: theme.radius.sm,
                          border: `1px solid ${theme.colors.gray[4]}`,
                          background: theme.colors.dark[5],
                        })}
                      >
                        <Image
                          height={18}
                          width={18}
                          src={`/assets/products/${cost.icon}`}
                          alt={cost.label}
                          style={{ display: 'block', objectFit: 'contain' }}
                        />
                      </Box>
                    </td>
                    <td>{cost.label}</td>
                    <td align="right">
                      x<strong>{cost.total}</strong>
                    </td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </Table>

        <Table horizontalSpacing={6} verticalSpacing={6}>
          <thead>
            <tr>
              <th colSpan={3}>Needs</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(needs).map((needId, k) => {
              let need = needs[needId];
              let iconFilter =
                needId === 'maintenance2'
                  ? 'brightness(0) saturate(100%) invert(99%) sepia(95%) saturate(7485%) hue-rotate(323deg) brightness(104%) contrast(97%)'
                  : '';
              if (need.total > 0) {
                return (
                  <tr key={`needs-${needId}-${k}`}>
                    <td className="fitwidth">
                      <Box
                        style={(theme) => ({
                          height: 32,
                          width: 32,
                          borderRadius: theme.radius.sm,
                          border: `1px solid ${theme.colors.gray[4]}`,
                          background: need.color,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        })}
                      >
                        <Image
                          height={18}
                          width={18}
                          src={`/assets/ui/${need.icon}`}
                          alt={need.label}
                          style={{ display: 'block', objectFit: 'contain' }}
                          styles={{ root: { filter: iconFilter } }}
                        />
                      </Box>
                    </td>
                    <td>{need.label}</td>
                    <td align="right">
                      x<strong>{need.total}</strong>
                    </td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </Table>
      </Stack>
    </Card>
  );
};

export default Home;
