import React from 'react';
import { Box, Text, ScrollArea, Container } from '@mantine/core';
import NavContext from 'components/navigation/NavContext';
import { NavLink } from 'react-router-dom';
import { MobileNavIcon } from 'components/ui/Misc';
import { useReaction } from 'state';
import Loader from 'components/app/Loader';
import { motion } from 'framer-motion';
import classes from './PageLayout.module.css';

type PageLayoutProps = {
  header?: React.ReactElement;
  showFooterNav?: boolean;
};

const PageLayout: React.FC<React.PropsWithChildren<PageLayoutProps>> = ({
  header,
  children,
  showFooterNav = true,
}) => {
  const { mobile } = React.useContext(NavContext);
  const [navigating, setNavigating] = React.useState<boolean>(false);
  const reaction = useReaction();

  React.useEffect(() =>
    reaction(
      (state) => state.navigating,
      (navigating) => {
        setNavigating(navigating);
      },
      {
        immediate: true,
      },
    ),
  );

  return (
    <Box className={classes.root} data-show-footer-nav={showFooterNav || undefined}>
      <motion.div
        variants={{
          enter: { y: 0, opacity: 0, transition: { duration: 0.25 } },
          target: { y: 0, opacity: 1, transition: { duration: 0.25 } },
          exit: { y: 0, opacity: 0, transition: { duration: 0.25 } },
        }}
        initial="enter"
        animate="target"
        exit="exit"
        style={{ height: '100%', position: 'relative' }}
      >
        {header}
      </motion.div>

      <Box style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
        <motion.div
          variants={{
            enter: { y: -100, opacity: 0, transition: { duration: 0.25 } },
            target: { y: 0, opacity: 1, transition: { duration: 0.25 } },
            exit: { y: 0, opacity: 0, transition: { duration: 0.25 } },
          }}
          initial="enter"
          animate="target"
          exit="exit"
          style={{ height: '100%', position: 'relative' }}
        >
          {!navigating ? (
            <ScrollArea
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}
            >
              <Container size="lg" className={classes.contentContainer}>
                {children}
              </Container>
            </ScrollArea>
          ) : (
            <Loader />
          )}
        </motion.div>
      </Box>

      {showFooterNav && (
        <Box className={classes.footerNav}>
          <Box
            className={classes.footerNavGrid}
            style={{ gridTemplateColumns: `repeat(${mobile.length}, 1fr)` }}
          >
            {mobile.map((i, k) => {
              return (
                <NavLink key={`mobile-nav-item-${k}`} to={i.to} className="mobile-nav-item">
                  <MobileNavIcon icon={i.icon} />
                  <Text size="xs" mt={2}>
                    {i.label}
                  </Text>
                </NavLink>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PageLayout;
