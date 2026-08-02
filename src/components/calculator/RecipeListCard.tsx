import React from 'react';
import type { CSSProperties } from 'react';
import { Card, Group, Box, Text, Image, Tooltip, Indicator, Divider } from '@mantine/core';
import { Recipe } from 'state/app/effects/loadJsonData';
import { RecipeId } from 'state/app/effects/loadJsonData';
import { useAppState } from 'state';
import { Icon } from '@iconify/react';
import productFlowClasses from 'components/ui/ProductFlowRow.module.css';
import classes from './RecipeListCard.module.css';

type RecipeListCardProps = {
  item: Recipe;
  active: boolean;
  available: boolean;
  onSelect(id: RecipeId): void;
};

const RecipeListCard: React.FC<RecipeListCardProps> = ({ item, active, available, onSelect }) => {
  const allProducts = useAppState((state) => state.products.items);
  const allMachines = useAppState((state) => state.machines.items);

  const onItemClick = React.useCallback(
    (id: RecipeId) => {
      if (available) {
        onSelect(id);
      }
    },
    [onSelect, available],
  );

  if (!item) return null;

  let recipeInputs = item.inputs.map((p) => {
    return {
      ...allProducts[p.id],
      quantity: p.quantity,
    };
  });
  let recipeOutputs = item.outputs.map((p) => {
    return {
      ...allProducts[p.id],
      quantity: p.quantity,
    };
  });

  let currentMachine = allMachines[item.machine];

  return (
    <Card
      onClick={() => onItemClick(item.id)}
      shadow="xs"
      className={classes.card}
      data-active={active || undefined}
      data-available={available || undefined}
      style={{ '--card-opacity': available ? 1 : 0.4 } as CSSProperties}
    >
      <Box
        style={{
          display: 'grid',
          gridGap: 20,
          gridTemplateColumns: 'auto 1fr',
        }}
      >
        <Box>
          <Box
            p={8}
            className={classes.machineIcon}
            style={(theme) => ({
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: theme.radius.sm,
              pointerEvents: 'none',
            })}
          >
            <Image src={`/assets/buildings/${currentMachine.icon}`} height={62} width={62} />
          </Box>
        </Box>
        <Box>
          <Group gap="xs">
            <Text style={{ fontSize: 16, lineHeight: '16px' }} fw="bold">
              {currentMachine.name}
            </Text>
            <Text style={{ fontSize: 16, lineHeight: '16px' }} color="dimmed">
              - {item.name}
            </Text>
          </Group>
          <Divider mt="xs" />
          <Group wrap="nowrap" mt={15}>
            <Group wrap="nowrap" gap="xs" className={productFlowClasses.row}>
              {recipeInputs.map((product) => {
                return (
                  <Group className="product-input" key={`input_${product.id}`} wrap="nowrap">
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
                            borderRadius: theme.radius.sm,
                            background: theme.colors.dark[3],
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
                  <Group
                    className="product-output"
                    gap="xs"
                    key={`output_${product.id}`}
                    wrap="nowrap"
                  >
                    <Tooltip label={product.name} withArrow color="red" withinPortal>
                      <Indicator
                        label={product.quantity < 1 ? '∞' : product.quantity}
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
                            borderRadius: theme.radius.sm,
                            background: theme.colors.dark[3],
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
          </Group>
        </Box>
      </Box>
    </Card>
  );
};

export default RecipeListCard;
