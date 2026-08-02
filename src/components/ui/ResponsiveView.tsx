import { Box } from '@mantine/core';
import React from 'react';

type ResponsiveViewProps = {
  breakPoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  renderDesktop: React.ReactElement;
  renderMobile: React.ReactElement;
};

const ResponsiveView: React.FC<ResponsiveViewProps> = ({
  breakPoint = 'md',
  renderDesktop,
  renderMobile,
}) => {
  return (
    <React.Fragment>
      <Box visibleFrom={breakPoint}>{renderDesktop}</Box>
      <Box hiddenFrom={breakPoint}>{renderMobile}</Box>
    </React.Fragment>
  );
};

export default ResponsiveView;
