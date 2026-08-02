import React, { ReactElement } from 'react';
import { Title, Box, Group, Container } from '@mantine/core';
import BreadCrumbs from './BreadCrumbs';
import ResponsiveView from 'components/ui/ResponsiveView';
import { BackButton } from 'components/navigation/BackButton';
import classes from './PageHeader.module.css';
type PageHeaderProps = {
  title: string;
  badge?: ReactElement;
  renderAction?: ReactElement;
};

const PageHeader: React.FC<PageHeaderProps> = ({ title, renderAction, badge }) => {
  return (
    <Container size="lg" className={classes.container}>
      <Box className={classes.headerBox}>
        <ResponsiveView
          renderDesktop={
            <Group justify="space-between">
              <Box>
                <BreadCrumbs />
                <Group>
                  <Title order={2} style={{ lineHeight: '30px' }}>
                    {title}
                  </Title>
                  {badge}
                </Group>
              </Box>
              {renderAction}
            </Group>
          }
          renderMobile={
            <Box>
              <Group justify="space-between">
                <Group gap="xs">
                  <BackButton />
                  <Group>
                    <Title order={2} style={(theme) => ({ fontSize: theme.fontSizes.lg })}>
                      {title}
                    </Title>
                    {badge}
                  </Group>
                </Group>
                {renderAction}
              </Group>
            </Box>
          }
        />
      </Box>
    </Container>
  );
};

export default PageHeader;
