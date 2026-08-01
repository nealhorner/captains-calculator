import { Alert, Box, Button, Divider, Group, Stack, Text } from '@mantine/core';
import { Icon } from '@iconify/react';

import { useActions, useAppState } from 'state';
import { ChainTarget } from 'state/_types';

import { ProductSelectDrawer } from 'components/calculator/ProductSelectDrawer';
import { BuildingSelectDrawer } from 'components/calculator/BuildingSelectDrawer';
import { RecipeSelectDrawer } from 'components/calculator/RecipeSelectDrawer';
import { TargetListCard } from 'components/calculator/TargetListCard';
import { ImportExportMenu } from 'components/calculator/ImportExportMenu';
import Icons from 'components/ui/Icons';

/**
 * The setup bar holds the list of products the factory is being built to
 * produce. Each target carries its own volume, and the drawers below only appear
 * while a target is being built up or edited.
 */
export const SetupBar = () => {
  // Select the module rather than the derived directly: Overmind only
  // re-renders reliably when the component tracks the underlying dictionary,
  // so subscribing this way is what makes a removed target disappear.
  const { targets, targetsList, activeTarget } = useAppState((state) => state.recipes);

  const createTarget = useActions().recipes.createTarget;
  const setActiveTarget = useActions().recipes.setActiveTarget;

  const isEditing = !!activeTarget;
  // Reading `targets` keeps this component subscribed to additions and removals.
  const currentTargets = Object.keys(targets)
    .map((id) => targetsList.find((t: ChainTarget) => t.id === id)!)
    .filter(Boolean);
  const otherTargets = currentTargets.filter(
    (target: ChainTarget) => target.id !== activeTarget?.id,
  );

  return (
    <Box>
      <ImportExportMenu />

      <Divider label="Production Targets" my="sm" />

      {isEditing ? (
        <Stack spacing="md">
          <Stack spacing="sm">
            <ProductSelectDrawer />
            {activeTarget?.productId && <BuildingSelectDrawer />}
            {activeTarget?.machineId && <RecipeSelectDrawer />}
          </Stack>

          <Button
            variant="light"
            onClick={() => setActiveTarget(null)}
            disabled={!activeTarget?.recipeId}
          >
            {activeTarget?.recipeId ? 'Done' : 'Choose a recipe to continue'}
          </Button>

          {!!otherTargets.length && (
            <Box>
              <Divider label="Other Targets" mb="sm" />
              <Stack spacing="xs">
                {otherTargets.map((target: ChainTarget) => (
                  <TargetListCard key={target.id} target={target} />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      ) : (
        <Stack spacing="sm">
          {currentTargets.length ? (
            <Stack spacing="xs">
              {currentTargets.map((target: ChainTarget) => (
                <TargetListCard key={target.id} target={target} />
              ))}
            </Stack>
          ) : (
            <Alert>
              <Text size="sm">
                Add a product you want to produce, set how much of it you need per 60 seconds, and
                the chain will be sized to match.
              </Text>
            </Alert>
          )}

          <Button onClick={() => createTarget()}>
            <Group spacing={6} noWrap>
              <Icon icon={Icons.add} width={14} />
              <span>Add Target Product</span>
            </Group>
          </Button>
        </Stack>
      )}
    </Box>
  );
};
