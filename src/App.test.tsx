import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import App from './App';
import { TestProviders, createInitializedTestOvermind } from 'test/renderApp';

// Only "/" (Calculator) and unmatched paths (NotFound) are wired up in
// routes/Guest.tsx today - Home/Buildings/Products/Recipes are commented out
// there, so they aren't reachable and are covered separately as standalone
// component smoke tests instead (see src/screens/app/*.test.tsx).
describe('App routing', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState(null, '', '/');
  });

  afterEach(() => {
    window.history.pushState(null, '', '/');
  });

  it('renders the Calculator screen at the root route without crashing', async () => {
    const overmind = await createInitializedTestOvermind();

    render(
      <TestProviders overmind={overmind}>
        <App />
      </TestProviders>,
    );

    // The setup bar is now a list of production targets rather than a single
    // product, so its heading changed with it.
    expect(screen.getByText('Production Targets')).toBeInTheDocument();
  });

  it('renders NotFound for an unmatched route without crashing', async () => {
    window.history.pushState(null, '', '/this-route-does-not-exist');
    const overmind = await createInitializedTestOvermind();

    render(
      <TestProviders overmind={overmind}>
        <App />
      </TestProviders>,
    );

    expect(screen.getAllByText('Page Not Found').length).toBeGreaterThan(0);
  });
});
