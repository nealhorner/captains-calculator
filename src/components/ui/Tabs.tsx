import React from 'react';
import { Divider, Tabs } from '@mantine/core';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';

import Icons, { IconNames } from 'components/ui/Icons';
import classes from './Tabs.module.css';

type PageTab = {
  label: string;
  icon?: IconNames;
  route: string;
};

type PageTabsProps = {
  parentId: string;
  tabs: Record<string, PageTab>;
  urlRoot: string;
};

export const PageTabs: React.FC<PageTabsProps> = ({ tabs, urlRoot, parentId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const match = matchPath({ path: `${urlRoot}/:id/:page`, end: true }, location.pathname);

  let activeTab = 0;

  if (match?.params.page) {
    let currentTabIndex = Object.keys(tabs).indexOf(match?.params.page);
    if (currentTabIndex >= 0) {
      activeTab = currentTabIndex;
    }
  }

  const onChange = (newTabIndex: number) => {
    let newTabKey = Object.keys(tabs)[newTabIndex];
    if (newTabKey) {
      let newTab = tabs[newTabKey];
      navigate(`${urlRoot}/${parentId}/${newTab.route}`);
    }
  };

  if (!parentId) return null;

  return (
    <Tabs
      value={String(activeTab)}
      onChange={(value) => value !== null && onChange(Number(value))}
      variant="unstyled"
      mb="md"
      classNames={{
        list: classes.list,
        tab: classes.tab,
      }}
    >
      <Tabs.List grow>
        {Object.keys(tabs).map((tabKey, index) => {
          let tab = tabs[tabKey];
          return (
            <Tabs.Tab
              key={tabKey}
              value={String(index)}
              leftSection={tab.icon ? <Icon icon={Icons[tab.icon]} width={17} /> : null}
            >
              {tab.label}
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
    </Tabs>
  );
};

export const TabDivider: React.FC<{ label: string }> = ({ label }) => (
  <Divider my="xs" mt={0} mb="md" label={label} variant="dashed" labelPosition="center" />
);
export const TabDividerStatus: React.FC<{ label: string; valid: boolean }> = ({ label, valid }) => (
  <Divider
    my="xs"
    mt={0}
    mb="md"
    label={label}
    variant="dashed"
    labelPosition="center"
    className={classes.statusDivider}
    style={
      {
        '--status-divider-color': !valid
          ? 'var(--mantine-color-red-9)'
          : 'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
      } as React.CSSProperties
    }
  />
);
export const TabDividerSpacing: React.FC<{ label: string }> = ({ label }) => (
  <Divider my="md" label={label} variant="dashed" labelPosition="center" />
);
