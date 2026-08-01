import React from 'react';
import { Avatar, Group, Text, Select, OptionsFilter } from '@mantine/core';
import { useAppState, useActions } from '../../state/index';
import { ProductId } from '../../state/app/effects/loadJsonData';

const labelFilter: OptionsFilter = ({ options, search }) =>
  options.filter(
    (option) =>
      'label' in option && option.label.toLowerCase().includes(search.toLowerCase().trim()),
  );

export const ProductSelect = () => {
  const { itemsList, currentItemId } = useAppState((state) => state.products);
  const selectProduct = useActions().products.selectProduct;
  const selectMachine = useActions().machines.selectMachine;
  const selectRecipe = useActions().recipes.selectRecipe;
  const delectRecipesItem = useActions().recipes.delectRecipesItem;
  const onChange = (productId: string | null) => {
    selectMachine(null);
    selectRecipe(null);
    delectRecipesItem(null);
    selectProduct(productId as ProductId | null);
  };
  const productsById = new Map(itemsList.map((p) => [p.id, p]));
  return (
    <Select
      size="md"
      comboboxProps={{ withinPortal: true, shadow: 'sm' }}
      value={currentItemId}
      onChange={onChange}
      label="1. Select Product"
      placeholder="Make Selection..."
      renderOption={({ option }) => {
        const product = productsById.get(option.value as ProductId);
        return (
          <Group wrap="nowrap">
            <Avatar src={product ? `/assets/products/${product.icon}` : undefined} />
            <div>
              <Text size="sm">{option.label}</Text>
            </div>
          </Group>
        );
      }}
      data={itemsList.map((p) => ({
        label: p.name,
        value: p.id,
      }))}
      searchable
      clearable
      maxDropdownHeight={400}
      nothingFoundMessage="No Match Found"
      filter={labelFilter}
    />
  );
};
