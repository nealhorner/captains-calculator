import type { CSSProperties } from 'react';
import { Box, useComputedColorScheme } from '@mantine/core';
import { SetupBar } from './SetupBar';
import { EditorWrapper } from './Editor';
import { ResultsSummary } from './ResultsSummary';
import classes from './EditorLayout.module.css';

export const EditorLayout = () => {
  const colorScheme = useComputedColorScheme('light');
  return (
    <Box
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '300px 1fr 300px',
        gridColumnGap: 0,
        gridRowGap: 0,
      }}
    >
      <Box p="md" className={classes.setupPanel}>
        <SetupBar />
      </Box>
      <Box
        className={classes.editorPanel}
        style={
          {
            '--editor-panel-bg-image': `url("/img/${colorScheme === 'light' ? 'squared-metal.png' : 'squared-metal-inverted.png'}")`,
          } as CSSProperties
        }
      >
        <EditorWrapper />
      </Box>
      <Box className={classes.resultsPanel}>
        <ResultsSummary />
      </Box>
    </Box>
  );
};
