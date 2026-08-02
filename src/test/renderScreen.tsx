import { MemoryRouter } from 'react-router-dom';

import NavContext, { NavContextType } from 'components/navigation/NavContext';
import guestRoutes from 'routes/Guest';
import { TestProviders, TestOvermind } from 'test/renderApp';

const navContextValue: NavContextType = guestRoutes;

export const RenderScreen: React.FC<{ children: React.ReactNode; overmind: TestOvermind }> = ({
  children,
  overmind,
}) => (
  <TestProviders overmind={overmind}>
    <NavContext.Provider value={navContextValue}>
      <MemoryRouter>{children}</MemoryRouter>
    </NavContext.Provider>
  </TestProviders>
);
