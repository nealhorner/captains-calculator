/**
 * Id generation for chain targets.
 *
 * Deliberately not in `actions/`: everything there is re-exported into the
 * Overmind actions namespace, which would wrap this helper and pass the context
 * as its first argument — so a call through the namespace would reserve the
 * wrong id.
 */
let targetSequence = 0;

export const nextTargetId = (): string => `target_${++targetSequence}`;

/**
 * Keeps the counter ahead of anything restored from a file or localStorage,
 * so a target added later cannot collide with one loaded earlier.
 */
export const reserveTargetId = (id: string): void => {
  const suffix = Number(id.slice(id.lastIndexOf('_') + 1));
  if (Number.isFinite(suffix) && suffix > targetSequence) targetSequence = suffix;
};
