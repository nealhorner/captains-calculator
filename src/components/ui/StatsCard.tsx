import type { CSSProperties } from 'react';
import { Icon } from '@iconify/react';
import { MantineColor } from '@mantine/core';
import { Box, Card, Group, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import Icons, { IconNames } from './Icons';
import classes from './StatsCard.module.css';

type StatsCardProps = {
  icon?: IconNames;
  label?: string;
  value?: number;
  link?: string;
  iconColor?: MantineColor;
};

const StatsCard: React.FC<StatsCardProps> = ({
  icon = null,
  label = null,
  value = null,
  link = false,
  iconColor = false,
  children,
}) => {
  const renderCardContent = () => {
    return (
      <>
        <Text color="gray" size="xs">
          {label}
        </Text>
        <Group justify="space-between">
          {icon && (
            <Box
              py="3px"
              className={classes.iconWrapper}
              style={
                {
                  lineHeight: 'var(--mantine-font-size-md)',
                  '--stats-icon-color': iconColor
                    ? `var(--mantine-color-${iconColor}-9)`
                    : 'light-dark(var(--mantine-color-gray-6), var(--mantine-color-dark-2))',
                } as CSSProperties
              }
            >
              <Icon icon={Icons[icon]} width="24" className="stats-card-icon" />
            </Box>
          )}
          <Box>
            <Text fw={700} size="xl" style={(theme) => ({ lineHeight: `${theme.fontSizes.lg}px` })}>
              {value}
            </Text>
          </Box>
        </Group>
      </>
    );
  };

  if (link) {
    return (
      <Card
        component={Link}
        to={link as string}
        shadow="sm"
        p="md"
        className={classes.cardHoverable}
      >
        {renderCardContent()}
      </Card>
    );
  }

  if (label !== null && value !== null) {
    return <Card shadow="sm">{renderCardContent()}</Card>;
  }

  return <Card shadow="sm">{children}</Card>;
};

export default StatsCard;
