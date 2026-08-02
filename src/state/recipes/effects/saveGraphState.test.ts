import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { saveGraphState } from './saveGraphState';
import { loadGraphState } from './loadGraphState';
import { ExportedGraph, EXPORT_FORMAT, EXPORT_FORMAT_VERSION } from '../importExport';

const graph = (quantity: number): ExportedGraph => ({
  format: EXPORT_FORMAT,
  version: EXPORT_FORMAT_VERSION,
  exportedAt: '2026-01-01T00:00:00.000Z',
  nodes: [],
  targets: [
    {
      id: 't1',
      productId: 'steel' as any,
      machineId: 'caster' as any,
      recipeId: 'cast_steel' as any,
      quantity,
      nodeId: 'n1',
    },
  ],
});

describe('saveGraphState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid writes into one', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    // Four keystrokes' worth of changes in quick succession.
    saveGraphState(graph(1));
    saveGraphState(graph(12));
    saveGraphState(graph(123));
    saveGraphState(graph(1234));

    expect(setItem).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(setItem).toHaveBeenCalledTimes(1);
    // The last value wins, so nothing is lost by coalescing.
    expect((loadGraphState() as ExportedGraph).targets[0].quantity).toBe(1234);

    setItem.mockRestore();
  });

  it('writes again after the previous write settles', () => {
    saveGraphState(graph(10));
    vi.runAllTimers();
    saveGraphState(graph(20));
    vi.runAllTimers();

    expect((loadGraphState() as ExportedGraph).targets[0].quantity).toBe(20);
  });

  it('does not throw when storage rejects the write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    saveGraphState(graph(1));
    expect(() => vi.runAllTimers()).not.toThrow();

    setItem.mockRestore();
  });
});
