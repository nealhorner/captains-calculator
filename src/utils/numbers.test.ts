import { describe, it, expect } from 'vitest';
import { formatRate, formatCount } from './numbers';

describe('formatRate', () => {
  it('formats ordinary rates to at most one decimal', () => {
    expect(formatRate(66.66666666666667)).toBe('66.7');
    expect(formatRate(100)).toBe('100');
    expect(formatRate(0)).toBe('0');
  });

  it('distinguishes NaN from infinity rather than showing both as ∞', () => {
    expect(formatRate(NaN)).toBe('—');
    expect(formatRate(Infinity)).toBe('∞');
  });

  it('does not render Infinity when rounding overflows', () => {
    expect(formatRate(Number.MAX_VALUE)).toBe('∞');
  });
});

describe('formatCount', () => {
  it('keeps two decimals for fractional building counts', () => {
    expect(formatCount(2.2222)).toBe('2.22');
    expect(formatCount(3)).toBe('3');
  });

  it('handles NaN and infinity', () => {
    expect(formatCount(NaN)).toBe('—');
    expect(formatCount(Infinity)).toBe('∞');
    expect(formatCount(Number.MAX_VALUE)).toBe('∞');
  });
});
