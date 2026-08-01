import React from 'react';
import { Box, Tabs, Card, Grid, Group, Image } from '@mantine/core';
import { useAppState, useActions } from 'state';
import { CategoryId } from 'state/app/effects';
import { GenericDictionary } from 'state/_types';
import AnimatedList, { AnimateListItem } from './AnimatedList';
import classes from './CategoryTabs.module.css';

type CategoryTabsProps = {};

let catOrderArray = [
  'general_machines',
  'water_extraction_and_processing',
  'food_production',
  'metallurgy_and_smelting',
  'power_production',
  'crude_oil_refining',
  'waste_management',
  'storage',
  'buildings',
  'buildings_for_vehicles',
  'housing_and_services',
  'cargo_docks',
];

export const CategoryTabs: React.FC<CategoryTabsProps> = () => {
  const { items: categories, currentItemId: currentCategoryId } = useAppState(
    (state) => state.categories,
  );
  const { selectCategory } = useActions().categories;
  const [activeTab, setActiveTab] = React.useState(
    currentCategoryId === null ? 0 : Object.keys(categories).indexOf(currentCategoryId) + 1,
  );

  let categoryTabs: GenericDictionary[] = [
    {
      id: 'all',
      label: 'Categories',
      icon: `all.png`,
    },
    ...catOrderArray.map((catId) => {
      let cat = categories[catId];
      return {
        id: cat.id,
        label: cat.name,
        icon: `${cat.id}.png`,
      };
    }),
  ];

  const onChange = (active: number, tabKey: CategoryId | 'all') => {
    setActiveTab(active);
    selectCategory(tabKey === 'all' ? null : tabKey);
  };

  if (currentCategoryId === null) {
    return (
      <Box>
        <AnimatedList>
          <Grid>
            {categoryTabs
              .filter((c) => c.id !== 'all')
              .map((cat, key) => {
                return (
                  <Grid.Col span={{ md: 6 }} key={cat.id}>
                    <AnimateListItem itemKey={cat.id}>
                      <Card
                        onClick={() => onChange(key, cat.id)}
                        shadow="xs"
                        className={classes.categoryCard}
                      >
                        <Group justify="space-between">
                          {cat.label}
                          <Box
                            p={3}
                            style={(theme) => ({
                              borderRadius: theme.radius.sm,
                              background: theme.colors.dark[5],
                            })}
                          >
                            <Image src={`/assets/categories/${cat.icon}`} alt={cat.label} />
                          </Box>
                        </Group>
                      </Card>
                    </AnimateListItem>
                  </Grid.Col>
                );
              })}
          </Grid>
        </AnimatedList>
      </Box>
    );
  }

  return (
    <Tabs
      value={String(activeTab)}
      onChange={(value) =>
        value !== null && onChange(Number(value), categoryTabs[Number(value)].id)
      }
      variant="unstyled"
      mb="md"
      classNames={{
        list: classes.list,
        tab: classes.tab,
      }}
    >
      <Tabs.List grow>
        {categoryTabs.map((tab, index) => {
          return (
            <Tabs.Tab
              key={tab.id}
              value={String(index)}
              leftSection={
                tab.icon ? (
                  <img height={20} src={`/assets/categories/${tab.icon}`} alt={tab.label} />
                ) : null
              }
            />
          );
        })}
      </Tabs.List>
    </Tabs>
  );
};
