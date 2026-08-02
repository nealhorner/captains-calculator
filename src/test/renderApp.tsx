import React from 'react';
import { createOvermind } from 'overmind';
import { Provider as StateProvider } from 'overmind-react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';

import { AppStateConfig } from 'state';
import theme from 'theme/theme';

export type TestOvermind = ReturnType<typeof createOvermind<typeof AppStateConfig>> & {
  initialized: Promise<unknown>;
};

export const createTestOvermind = (): TestOvermind =>
  createOvermind(AppStateConfig, { devtools: false }) as TestOvermind;

// onInitializeOvermind (settings/game data load) runs automatically but
// asynchronously. overmind-react's subscription doesn't reliably trigger a
// re-render off that automatic initial mutation under jsdom/vitest, so tests
// await it up front and render only once state is already settled.
export const createInitializedTestOvermind = async (): Promise<TestOvermind> => {
  const overmind = createTestOvermind();
  await overmind.initialized;
  return overmind;
};

export const TestProviders: React.FC<{
  children: React.ReactNode;
  overmind: TestOvermind;
}> = ({ children, overmind }) => {
  return (
    <StateProvider value={overmind}>
      <MantineProvider theme={theme} forceColorScheme="light">
        <ModalsProvider>{children}</ModalsProvider>
      </MantineProvider>
    </StateProvider>
  );
};
