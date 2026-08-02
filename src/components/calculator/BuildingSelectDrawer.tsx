import React, { ChangeEvent } from 'react';
import { Icon } from '@iconify/react';
import { Box, Button, Drawer, Input, Text, Stack } from '@mantine/core';

import Icons from 'components/ui/Icons';

import { useAppState, useActions } from 'state';
import MachineListCard from './MachineListCard';
import { DrawerBody, DrawerBodyScrollArea } from 'components/ui/DrawerBody';
import { MachineId } from 'state/app/effects';

export const BuildingSelectDrawer = () => {
  const allProducts = useAppState((state) => state.products.items);
  const activeTarget = useAppState((state) => state.recipes.activeTarget);
  const { itemsList, items } = useAppState((state) => state.machines);

  const setTargetMachine = useActions().recipes.setTargetMachine;

  const [opened, setOpened] = React.useState(false);
  const [filter, setFilter] = React.useState('');

  const currentProduct = activeTarget?.productId ? allProducts[activeTarget.productId] : null;
  const currentItem = activeTarget?.machineId ? items[activeTarget.machineId] : null;

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  const handleSelectMachine = (id: MachineId) => {
    setFilter('');
    setTargetMachine(id);
    setOpened(false);
  };

  if (!currentProduct) return null;

  let filteredMachines = itemsList.filter((m) => currentProduct.machines.output.indexOf(m.id) >= 0);
  let filteredItems =
    filter.length < 3
      ? filteredMachines
      : filteredMachines.filter((item) =>
          item.name.toLowerCase().includes(filter.toLowerCase().trim()),
        );

  const renderBody = () => {
    return (
      <DrawerBody>
        <Box
          style={{
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
          }}
        >
          <Box p="md">
            <Input
              value={filter}
              onChange={handleFilterChange}
              leftSection={<Icon icon={Icons.search} />}
              placeholder="Building Search"
              size="lg"
            />
          </Box>
          <DrawerBodyScrollArea>
            <Box p="md" pt={0}>
              <Stack gap="xs">
                {filteredItems.map((i, k) => (
                  <MachineListCard
                    key={k}
                    item={i}
                    active={currentItem?.id === i.id}
                    onSelect={() => handleSelectMachine(i.id)}
                  />
                ))}
              </Stack>
            </Box>
          </DrawerBodyScrollArea>
        </Box>
      </DrawerBody>
    );
  };

  return (
    <>
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title="Select Production Building"
        padding={0}
        size="xl"
        overlayProps={{ blur: 3 }}
        position="left"
      >
        {renderBody()}
      </Drawer>

      <Box>
        <Text fw="bold" mb="xs">
          2. Production Building
        </Text>
        {currentItem ? (
          <MachineListCard item={currentItem} active={false} onSelect={() => setOpened(true)} />
        ) : (
          <Button onClick={() => setOpened(true)}>Click To Select</Button>
        )}
      </Box>
    </>
  );
};
