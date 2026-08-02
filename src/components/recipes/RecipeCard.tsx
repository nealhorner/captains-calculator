import React from 'react';
import { Box, Group, Text, Image, Indicator, Stack } from '@mantine/core';
import { useAppState } from '../../state/index';
import { Icon } from '@iconify/react';
import productFlowClasses from 'components/ui/ProductFlowRow.module.css';

export const RecipeCard = () => {
  const { currentItem: currentRecipe } = useAppState((state) => state.recipes);
  const products = useAppState((state) => state.products.items);

  if (!currentRecipe) return null;

  let recipeInputs = currentRecipe.inputs.map((p) => {
    return {
      ...products[p.id],
      quantity: p.quantity,
    };
  });
  let recipeOutputs = currentRecipe.outputs.map((p) => {
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
              <Stack gap={5} align="center">
                <Indicator
                  label={product.quantity}
                  color="green"
                  radius="xs"
                  styles={{
                    indicator: { fontSize: 11, height: 'auto', paddingRight: 5, paddingLeft: 5 },
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
                <Text size="xs">{product.name}</Text>
              </Stack>
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
              <Stack gap={5}>
                <Indicator
                  label={product.quantity}
                  color="red"
                  radius="xs"
                  styles={{
                    indicator: { fontSize: 11, height: 'auto', paddingRight: 5, paddingLeft: 5 },
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
              </Stack>
              <Icon className="product-icon" icon="icomoon-free:plus" width={10} />
            </Group>
          );
        })}
      </Group>
    </Group>
  );
};
