// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom doesn't implement ResizeObserver; react-flow-renderer requires it to
// measure nodes/viewport.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// Node's own built-in `localStorage`/`sessionStorage` globals already exist on
// `global` by the time vitest's jsdom environment runs, so vitest's key-copy
// step (which skips keys already present on `global`) leaves Node's version in
// place instead of jsdom's — Node's default implementation isn't backed by
// jsdom's per-origin storage and returns `undefined`. Force jsdom's versions
// through explicitly.
Object.defineProperty(globalThis, 'localStorage', {
  value: window.localStorage,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, 'sessionStorage', {
  value: window.sessionStorage,
  configurable: true,
  writable: true,
});

// jsdom doesn't implement matchMedia; Mantine's responsive hooks need it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
