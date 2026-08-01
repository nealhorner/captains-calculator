export const decimalToPercentage = (value: number): string => {
  return (Math.round((value * 100 + Number.EPSILON) * 100) / 100).toString() + '%';
};

/**
 * Tolerance for comparing production rates. Deriving building counts from a
 * target volume produces values like 66.66666666666667, so rates can never be
 * compared with `===`.
 */
export const EPSILON = 1e-6;

/**
 * Formats a production rate for display. Rates are per 60 seconds and routinely
 * fractional, but the node badges are narrow, so this keeps at most one decimal
 * and drops a trailing `.0`.
 */
export const formatRate = (value: number): string => {
  if (Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return '∞';
  const rounded = Math.round(value * 10) / 10;
  // A large enough finite value can still overflow while rounding.
  if (!Number.isFinite(rounded)) return '∞';
  if (Math.abs(rounded) < EPSILON) return '0';
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
};

/**
 * Formats a building count. Counts are fractional (2.22 smelters) so this keeps
 * two decimals, again dropping a redundant `.00`.
 */
export const formatCount = (value: number): string => {
  if (Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return '∞';
  const rounded = Math.round(value * 100) / 100;
  if (!Number.isFinite(rounded)) return '∞';
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
};
