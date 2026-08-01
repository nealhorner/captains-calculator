import React from 'react';
import { Box, Button, Drawer, Text, Stack, Card, Group, Image } from '@mantine/core';

import { useAppState, useActions } from 'state';
import RecipeListCard from './RecipeListCard';
import { DrawerBody, DrawerBodyScrollArea } from 'components/ui/DrawerBody';
import { RecipeId } from 'state/app/effects';
import classes from './RecipeSelectDrawer.module.css';

export const RecipeSelectDrawer = () => {
  const currentProduct = useAppState((state) => state.products.currentItem);
  const currentMachine = useAppState((state) => state.machines.currentItem);

  const { itemsList, currentItem } = useAppState((state) => state.recipes);

  const selectRecipe = useActions().recipes.selectRecipe;
  const selectRecipesItem = useActions().recipes.selectRecipesItem;
  const resetNodes = useActions().recipes.resetNodes;

  const [opened, setOpened] = React.useState(false);

  const handleSelectRecipe = (id: RecipeId) => {
    resetNodes();
    selectRecipe(id);
    selectRecipesItem(id);
    setOpened(false);
  };

  if (!currentMachine || !currentProduct) return null;

  let filteredItems = itemsList.filter((recipe) => {
    return (
      currentMachine.recipes.indexOf(recipe.id as RecipeId) >= 0 &&
      recipe.outputs.find((product) => product.id === currentProduct.id)
    );
  });

  const renderBody = () => {
    return (
      <DrawerBody>
        <DrawerBodyScrollArea>
          <Box p="md">
            <Stack gap="xs">
              {filteredItems.map((i, k) => (
                <RecipeListCard
                  key={k}
                  item={i}
                  active={currentItem?.id === i.id}
                  available={true}
                  onSelect={() => handleSelectRecipe(i.id)}
                />
              ))}
            </Stack>
          </Box>
        </DrawerBodyScrollArea>
      </DrawerBody>
    );
  };

  return (
    <>
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title="Select Recipe"
        padding={0}
        size="xl"
        overlayProps={{ blur: 3 }}
        position="left"
      >
        {renderBody()}
      </Drawer>

      <Box>
        <Text fw="bold" mb="xs">
          3. Production Recipe
        </Text>
        {currentItem ? (
          <Card onClick={() => setOpened(true)} shadow="xs" p="xs" className={classes.card}>
            <Group justify="space-between">
              <Text fw={500} size="sm">
                {currentItem.name}
              </Text>
              <Box
                p="xs"
                style={(theme) => ({
                  borderRadius: theme.radius.sm,
                  background: theme.colors.dark[3],
                })}
              >
                <Image
                  height={24}
                  radius="md"
                  src={`/assets/products/${currentProduct.icon}`}
                  alt={currentProduct.name}
                />
              </Box>
            </Group>
          </Card>
        ) : (
          <Button onClick={() => setOpened(true)}>Click To Select</Button>
        )}
      </Box>
    </>
  );
};
