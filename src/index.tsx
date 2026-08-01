import { createRoot } from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { MantineProvider } from '@mantine/core';
import { createOvermind } from 'overmind';
import { Provider as StateProvider } from 'overmind-react';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';

import App from './App';

import { AppStateConfig, useAppState } from 'state';
import theme from 'theme/theme';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'theme/scss/index.scss';

const overmind = createOvermind(AppStateConfig, {
  devtools: true,
});

const Root = () => {
  const { theme: colorScheme } = useAppState().settings;

  return (
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <ModalsProvider>
        <Notifications position="bottom-left" />
        <App />
      </ModalsProvider>
    </MantineProvider>
  );
};

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StateProvider value={overmind}>
    <Root />
  </StateProvider>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
