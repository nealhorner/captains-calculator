import React from 'react';
import { Avatar, Group, Text, Select, OptionsFilter } from '@mantine/core';
import { useAppState, useActions } from '../../state/index';
import { MachineId } from '../../state/app/effects/loadJsonData';

const labelFilter: OptionsFilter = ({ options, search }) =>
  options.filter(
    (option) =>
      'label' in option && option.label.toLowerCase().includes(search.toLowerCase().trim()),
  );

export const ProductMachineSelect = () => {
  const currentProduct = useAppState((state) => state.products.currentItem);
  const { itemsList, currentItemId } = useAppState((state) => state.machines);
  const selectMachine = useActions().machines.selectMachine;
  const selectRecipe = useActions().recipes.selectRecipe;
  const delectRecipesItem = useActions().recipes.delectRecipesItem;
  const onChange = (machineId: string | null) => {
    if (!machineId) return;
    selectRecipe(null);
    delectRecipesItem(null);
    selectMachine(machineId as MachineId);
  };
  if (!currentProduct) return null;
  let filteredMachines = itemsList.filter((m) => currentProduct.machines.output.indexOf(m.id) >= 0);
  const machinesById = new Map(filteredMachines.map((m) => [m.id, m]));
  return (
    <Select
      size="md"
      value={currentItemId}
      onChange={onChange}
      label="2. Select Building"
      placeholder="Make Selection..."
      renderOption={({ option }) => {
        const machine = machinesById.get(option.value as MachineId);
        return (
          <Group wrap="nowrap">
            <Avatar src={machine ? `/assets/buildings/${machine.icon}` : undefined} />
            <div>
              <Text size="sm">{option.label}</Text>
            </div>
          </Group>
        );
      }}
      data={filteredMachines.map((p) => ({
        label: p.name,
        value: p.id,
      }))}
      searchable
      maxDropdownHeight={400}
      nothingFoundMessage="No Match Found"
      filter={labelFilter}
    />
  );
};
