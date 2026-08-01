import React from 'react';
import {
  Box,
  Card,
  Group,
  Image,
  NumberInput,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useModals } from '@mantine/modals';
import { Icon } from '@iconify/react';

import { useActions, useAppState } from 'state';
import { ChainTarget } from 'state/_types';
import Icons from 'components/ui/Icons';
import { formatCount } from 'utils/numbers';

type TargetListCardProps = {
  target: ChainTarget;
};

/**
 * One production goal in the setup bar: what to make, from which recipe, and how
 * much of it per 60 seconds. The volume drives the size of the whole chain
 * behind it.
 */
export const TargetListCard: React.FC<TargetListCardProps> = ({ target }) => {
  const products = useAppState((state) => state.products.items);
  const machines = useAppState((state) => state.machines.items);
  const recipes = useAppState((state) => state.recipes.items);
  const nodes = useAppState((state) => state.recipes.nodes);

  const setActiveTarget = useActions().recipes.setActiveTarget;
  const setTargetQuantity = useActions().recipes.setTargetQuantity;
  const removeTarget = useActions().recipes.removeTarget;

  const modals = useModals();

  const product = target.productId ? products[target.productId] : null;
  const machine = target.machineId ? machines[target.machineId] : null;
  const recipe = target.recipeId ? recipes[target.recipeId] : null;
  const node = target.nodeId ? nodes[target.nodeId] : null;

  const handleRemove = () => {
    modals.openConfirmModal({
      title: 'Remove Target',
      centered: true,
      children: (
        <Text size="sm">
          Remove <strong>{product ? product.name : 'this target'}</strong> from your production
          chain? Buildings only needed for this target will be removed too.
        </Text>
      ),
      confirmProps: { color: 'red' },
      labels: { confirm: 'Remove Target', cancel: 'Cancel' },
      onConfirm: () => removeTarget(target.id),
    });
  };

  const handleQuantityChange = (value: number | undefined) => {
    setTargetQuantity({ targetId: target.id, quantity: value ?? 0 });
  };

  return (
    <Card
      shadow="xs"
      p="xs"
      sx={(theme) => ({
        border: `1px solid ${theme.colorScheme === 'light' ? theme.colors.gray[3] : theme.colors.dark[5]}`,
      })}
    >
      <Stack spacing={6}>
        <Group position="apart" noWrap>
          <Group spacing={8} noWrap sx={{ overflow: 'hidden' }}>
            <Box
              p={4}
              sx={(theme) => ({
                borderRadius: theme.radius.sm,
                background: theme.colors.dark[3],
                flexShrink: 0,
              })}
            >
              <Image
                height={20}
                width={20}
                src={`/assets/products/${product ? product.icon : 'Placeholder.png'}`}
                alt={product ? product.name : 'No product selected'}
                sx={{ display: 'block', objectFit: 'contain' }}
              />
            </Box>
            <Text weight={600} size="sm" sx={{ lineHeight: 1.2 }}>
              {product ? product.name : 'Select a product'}
            </Text>
          </Group>

          <Group spacing={2} noWrap sx={{ flexShrink: 0 }}>
            <Tooltip label="Change product, building or recipe" withArrow withinPortal>
              <UnstyledButton
                aria-label="Edit target"
                onClick={() => setActiveTarget(target.id)}
                sx={(theme) => ({
                  display: 'flex',
                  padding: 4,
                  borderRadius: theme.radius.sm,
                  color:
                    theme.colorScheme === 'light' ? theme.colors.gray[7] : theme.colors.gray[5],
                  '&:hover': {
                    backgroundColor:
                      theme.colorScheme === 'light' ? theme.colors.gray[2] : theme.colors.dark[6],
                  },
                })}
              >
                <Icon icon={Icons.edit} width={16} />
              </UnstyledButton>
            </Tooltip>
            <Tooltip label="Remove target" withArrow withinPortal>
              <UnstyledButton
                aria-label="Remove target"
                onClick={handleRemove}
                sx={(theme) => ({
                  display: 'flex',
                  padding: 4,
                  borderRadius: theme.radius.sm,
                  color: theme.colors.red[7],
                  '&:hover': {
                    backgroundColor:
                      theme.colorScheme === 'light' ? theme.colors.gray[2] : theme.colors.dark[6],
                  },
                })}
              >
                <Icon icon={Icons.delete} width={16} />
              </UnstyledButton>
            </Tooltip>
          </Group>
        </Group>

        {(machine || recipe) && (
          <Text size="xs" color="dimmed" sx={{ lineHeight: 1.3 }}>
            {[recipe?.name, machine?.name].filter(Boolean).join(' · ')}
          </Text>
        )}

        {target.recipeId ? (
          <React.Fragment>
            <NumberInput
              size="xs"
              label="Target output"
              value={target.quantity}
              onChange={handleQuantityChange}
              min={0}
              step={1}
              precision={2}
              noClampOnBlur
              rightSection={
                <Text size="xs" color="dimmed" pr={4}>
                  /60s
                </Text>
              }
              rightSectionWidth={44}
              styles={{ rightSection: { pointerEvents: 'none' } }}
            />
            {node && (
              <Text size="xs" color="dimmed">
                {`${formatCount(node.machinesCount)} × ${node.machine.name}`}
                {node.buildingsRequired !== node.machinesCount &&
                  ` (build ${node.buildingsRequired})`}
              </Text>
            )}
          </React.Fragment>
        ) : (
          <Text size="xs" color="dimmed">
            Pick a building and recipe to finish this target.
          </Text>
        )}
      </Stack>
    </Card>
  );
};

export default TargetListCard;
