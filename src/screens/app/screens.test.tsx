import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import Home from './Home';
import Buildings from './Buildings';
import Products from './Products';
import Recipes from './Recipes';
import NotFound from '../global/NotFound';
import { RenderScreen } from 'test/renderScreen';
import { createInitializedTestOvermind } from 'test/renderApp';

// Home/Buildings/Products/Recipes aren't wired into routes/Guest.tsx today
// (only Calculator and NotFound are - see App.test.tsx), but they're real
// shipped components, so smoke-test each in isolation to catch render
// crashes even though they're unreachable from the router right now.
//
// PageHeader renders both a desktop and mobile title (toggled with CSS
// media queries, which jsdom doesn't apply), so text assertions use
// getAllByText rather than assuming a single match.
describe('Screen smoke tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Home without crashing', async () => {
    const overmind = await createInitializedTestOvermind();
    render(
      <RenderScreen overmind={overmind}>
        <Home />
      </RenderScreen>,
    );
    expect(screen.getAllByText('Welcome').length).toBeGreaterThan(0);
  });

  it('renders Buildings without crashing', async () => {
    const overmind = await createInitializedTestOvermind();
    render(
      <RenderScreen overmind={overmind}>
        <Buildings />
      </RenderScreen>,
    );
    expect(screen.getAllByText('Buildings & Machines').length).toBeGreaterThan(0);
  });

  it('renders Products without crashing', async () => {
    const overmind = await createInitializedTestOvermind();
    render(
      <RenderScreen overmind={overmind}>
        <Products />
      </RenderScreen>,
    );
    expect(screen.getAllByText('Products').length).toBeGreaterThan(0);
  });

  it('renders Recipes without crashing', async () => {
    const overmind = await createInitializedTestOvermind();
    render(
      <RenderScreen overmind={overmind}>
        <Recipes />
      </RenderScreen>,
    );
    expect(screen.getAllByText('Welcome').length).toBeGreaterThan(0);
  });

  it('renders NotFound without crashing', async () => {
    const overmind = await createInitializedTestOvermind();
    render(
      <RenderScreen overmind={overmind}>
        <NotFound />
      </RenderScreen>,
    );
    expect(screen.getAllByText('Page Not Found').length).toBeGreaterThan(0);
  });
});
