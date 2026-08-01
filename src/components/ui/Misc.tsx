import { Icon } from '@iconify/react';
import { Paper, Text, useMantineTheme, useComputedColorScheme } from '@mantine/core';

export const EmptyPageComponent: React.FC<{ label: string }> = ({ label }) => {
  const colorScheme = useComputedColorScheme('light');
  return (
    <Paper
      p="lg"
      style={(theme) => ({
        backgroundColor: colorScheme === 'light' ? theme.colors.gray[2] : theme.colors.dark[8],
      })}
    >
      <Text
        ta="center"
        fw={100}
        size="xs"
        style={(theme) => ({
          color: colorScheme === 'light' ? theme.colors.gray[5] : theme.colors.dark[4],
        })}
      >
        No {label} Match The Current Filter
      </Text>
    </Paper>
  );
};

export const MobileNavIcon: React.FC<{ icon: string }> = ({ icon }) => {
  const theme = useMantineTheme();
  return <Icon icon={icon} width="24" color={theme.colors.red[9]} />;
};
