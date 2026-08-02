import { Menu, Button, useMantineTheme, Divider, useComputedColorScheme } from '@mantine/core';
import { Icon } from '@iconify/react';
import { useActions } from 'state';
import Icons from './Icons';

const ProfileMenu = () => {
  const theme = useMantineTheme();
  const { toggleColorScheme } = useActions();
  const colorScheme = useComputedColorScheme('light');
  return (
    <Menu withArrow>
      <Menu.Target>
        <Button px={7} variant="subtle" color={colorScheme === 'light' ? 'dark' : 'dark'}>
          <Icon
            icon={Icons.user}
            color={colorScheme === 'light' ? theme.colors.red[9] : theme.colors.dark[5]}
            width={28}
          />
        </Button>
      </Menu.Target>
      <Menu.Dropdown style={{ display: 'flex' }}>
        <Menu.Item
          leftSection={<Icon icon={colorScheme === 'light' ? Icons.dark : Icons.light} />}
          onClick={() => toggleColorScheme()}
        >
          Toggle {colorScheme === 'light' ? 'Dark' : 'Light'} Theme
        </Menu.Item>
        <Divider />
      </Menu.Dropdown>
    </Menu>
  );
};

export default ProfileMenu;
