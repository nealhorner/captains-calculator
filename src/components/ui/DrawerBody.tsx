import React from 'react';
import { Box, ScrollArea } from '@mantine/core';

export const DrawerBodyScrollArea: React.FC = ({ children }) => {
  return (
    <Box
      style={{
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
      }}
    >
      <ScrollArea
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        {children}
      </ScrollArea>
    </Box>
  );
};

export const DrawerBody: React.FC = ({ children }) => {
  return (
    <Box
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'grid',
      }}
    >
      {children}
    </Box>
  );
};
