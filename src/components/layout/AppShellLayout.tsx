import {
  AppShell,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  Stack,
  ThemeIcon,
  useMantineTheme,
  useComputedColorScheme,
  Text,
  List,
} from '@mantine/core';
import React from 'react';
import { Link, NavLink, useRoutes } from 'react-router-dom';
import { Icon } from '@iconify/react';
import NavContext from 'components/navigation/NavContext';
import { RenderNavigator } from 'components/navigation/Layout';
import { useActions, useAppState } from 'state';
import Icons from 'components/ui/Icons';
import { notifications } from '@mantine/notifications';
import classes from './AppShellLayout.module.css';

type SideBarNavButtonProps = {
  to: string;
  label: string;
  icon: string;
  onClick?(): void;
};

const SideBarNavButton: React.FC<SideBarNavButtonProps> = ({ to, label, icon, onClick }) => {
  const theme = useMantineTheme();
  return (
    <Button
      variant="subtle"
      color="dark"
      to={to}
      component={NavLink}
      size="lg"
      leftSection={
        <ThemeIcon color="dark" variant="outline" size="lg">
          <Icon icon={icon} width="20" color={theme.colors.red[9]} />
        </ThemeIcon>
      }
      onClick={onClick}
      className={classes.sideBarButton}
    >
      {label}
    </Button>
  );
};

const TopBarNavButton: React.FC<SideBarNavButtonProps> = ({ to, label, icon, onClick }) => {
  return (
    <Button
      variant="subtle"
      color="dark"
      to={to}
      component={NavLink}
      onClick={onClick}
      className={classes.topBarButton}
    >
      {label}
    </Button>
  );
};

const ColorSchemeToggle = () => {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme('light');
  const { toggleColorScheme } = useActions();
  return (
    <Button
      variant="default"
      color="gray"
      onClick={() => toggleColorScheme()}
      className={classes.colorSchemeToggle}
    >
      <Icon
        icon={colorScheme === 'light' ? Icons.dark : Icons.light}
        color={colorScheme === 'dark' ? theme.white : theme.black}
      />
    </Button>
  );
};

const TopBarNavLink: React.FC<SideBarNavButtonProps> = ({ to, label }) => {
  return (
    <Button
      variant="subtle"
      color="dark"
      href={to}
      target="_blank"
      component="a"
      className={classes.topBarLink}
    >
      {label}
    </Button>
  );
};

const showReleaseNotes = () =>
  notifications.show({
    id: Date.now().toString(),
    title: 'Release Notes',
    autoClose: 10000,
    withCloseButton: false,
    message: (
      <Box>
        <Box>
          <Text fw={600}>v0.0.4 (4/1/2026)</Text>
          <List size="sm">
            <List.Item>Updated for Latest Game Version (v0.8.2c)</List.Item>
          </List>
        </Box>
      </Box>
    ),
  });

const AppShellLayout: React.FC = () => {
  const appVersion = useAppState((state) => state.version);
  const { routes, menu } = React.useContext(NavContext);
  const navigator = useRoutes(routes);
  const [opened, setOpened] = React.useState(false);
  const theme = useMantineTheme();
  React.useEffect(() => {
    showReleaseNotes();
  }, []);
  return (
    <React.Fragment>
      <AppShell
        header={{ height: 70 }}
        navbar={{ width: 300, breakpoint: 'md', collapsed: { desktop: true, mobile: !opened } }}
        padding={0}
        styles={{
          root: {
            height: '100%',
          },
          main: {
            height: '100%',
            minHeight: '100%',
            maxHeight: '100%',
          },
        }}
      >
        <AppShell.Navbar p="md" mt={1}>
          <AppShell.Section>
            <Box px="xl" pt="xs">
              <Divider mt="lg" mb="md" variant="dashed" />
            </Box>
          </AppShell.Section>
          <AppShell.Section grow>
            <Stack gap="xs">
              {menu.map((i, k) => {
                return (
                  <SideBarNavButton
                    key={`nav-item-${k}`}
                    to={i.to}
                    label={i.label}
                    icon={i.icon}
                    onClick={() => setOpened((o) => !o)}
                  />
                );
              })}
            </Stack>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Header>
          <Box style={{ height: '100%' }}>
            <Box
              px="md"
              style={{
                height: '100%',
                borderImageSlice: 2,
                borderBottomWidth: 5,
                borderImageSource: 'linear-gradient(45deg, #FCA23A, #FCA23A)',
                backgroundColor: theme.colors.dark[8],
              }}
            >
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  height: '100%',
                }}
              >
                <Group>
                  <Burger
                    hiddenFrom="md"
                    opened={opened}
                    onClick={() => setOpened((o) => !o)}
                    size="sm"
                    color={theme.colors.gray[6]}
                  />
                  <Group gap="xs" align="flex-end">
                    <a href="/" title="Captain's Calculator">
                      <img
                        src="/img/logo.png"
                        alt="Captain's Calculator"
                        title="Captain's Calculator"
                      />
                    </a>
                    <Text c="white" size="sm">
                      v{appVersion}
                    </Text>
                  </Group>
                </Group>

                <Box>
                  <Group gap="xs" grow visibleFrom="md" style={{ height: '100%' }}>
                    {menu.map((i, k) => {
                      return (
                        <TopBarNavButton
                          key={`nav-item-${k}`}
                          to={i.to}
                          label={i.label}
                          icon={i.icon}
                          onClick={() => setOpened((o) => !o)}
                        />
                      );
                    })}
                    <TopBarNavLink
                      to="https://github.com/David-Melo/captains-calculator/issues"
                      label="Bugs & Issues"
                      icon="bug"
                    />
                    <ColorSchemeToggle />
                  </Group>
                </Box>
              </Box>
            </Box>
          </Box>
        </AppShell.Header>

        <AppShell.Main style={{ height: '100%' }}>
          <Box className="page-shell-wrapper" style={{ height: '100%', overflow: 'hidden' }}>
            <RenderNavigator navigator={navigator} />
          </Box>
        </AppShell.Main>
      </AppShell>
    </React.Fragment>
  );
};

export default AppShellLayout;
