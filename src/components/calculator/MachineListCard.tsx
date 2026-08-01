import React from 'react';
import { Card, Group, Box, Text, Image } from '@mantine/core';
import { Machine } from 'state/app/effects/loadJsonData';
import { MachineId } from 'state/app/effects/loadJsonData';
import classes from './MachineListCard.module.css';

type MachineListCardProps = {
  item: Machine;
  active: boolean;
  onSelect(id: MachineId): void;
};

const MachineListCard: React.FC<MachineListCardProps> = ({ item, active, onSelect }) => {
  const onItemClick = React.useCallback(
    (id: MachineId) => {
      onSelect(id);
    },
    [onSelect],
  );
  return (
    <Card
      onClick={() => onItemClick(item.id)}
      shadow="xs"
      p="xs"
      className={classes.card}
      data-active={active || undefined}
    >
      <Group justify="space-between">
        <Text fw={500} size="sm">
          {item.name}
        </Text>
        <Box
          p="xs"
          style={(theme) => ({
            borderRadius: theme.radius.sm,
            background: theme.colors.dark[3],
          })}
        >
          <Image height={24} radius="md" src={`/assets/buildings/${item.icon}`} alt={item.name} />
        </Box>
      </Group>
    </Card>
  );
};

export default MachineListCard;
