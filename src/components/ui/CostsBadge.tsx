import { Box, Text, Image, Group, Tooltip } from '@mantine/core';
import React from 'react';
import { useAppState } from 'state';
import { BuildCost } from 'state/app/effects';

type CostsBadgeProps = {
  product: BuildCost;
  mode?: 'long' | 'short';
  suffix?: string;
};

const CostsBadge: React.FC<CostsBadgeProps> = ({ product, mode = 'short', suffix = null }) => {
  const products = useAppState((state) => state.products.items);
  const productData = products[product.id];
  let value = Math.round(product.quantity * 10) / 10;

  return (
    <Tooltip label={product.name} withArrow withinPortal>
      <Box
        pl={3}
        pr={5}
        style={(theme) => ({
          borderRadius: theme.radius.sm,
          background: theme.colors.dark[4],
          height: 32,
          display: 'flex',
          alignItems: 'center',
        })}
      >
        {mode === 'long' ? (
          <Group justify="flex-start" gap={5}>
            <Image
              style={{ display: 'block' }}
              height={16}
              src={`/assets/products/${productData.icon}`}
            />
            <Text color="white" size="xs">
              {product.name}
            </Text>
          </Group>
        ) : (
          <Box px={4}>
            <Image
              style={{ display: 'block' }}
              height={16}
              src={`/assets/products/${productData.icon}`}
            />
          </Box>
        )}

        <Box
          px={4}
          py={1}
          style={(theme) => ({
            borderRadius: theme.radius.sm,
            background: '#141517',
          })}
        >
          <Text color="white" fw="lighter" style={{ fontSize: 12 }}>
            {value}
            {suffix ? ` ${suffix}` : ''}
          </Text>
        </Box>
      </Box>
    </Tooltip>
  );
};

export default CostsBadge;
