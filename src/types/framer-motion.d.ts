// framer-motion 3.10.6's package.json "exports" map has no "types" condition, so
// moduleResolution "bundler"/"node16" can't find its declarations via the bare
// specifier (legacy "node" resolution ignored "exports" for types and found them
// anyway). The named re-exports below bypass the exports map restriction (it only
// applies to bare-specifier resolution) to pull in the package's real types for
// the two symbols this repo actually imports, keeping full type safety instead of
// falling back to implicit any. Re-exporting via a relative path here is invalid
// (TS2439 — ambient module declarations can't reference relative module names,
// only masked while skipLibCheck is on), so "framer-motion/internal-types" is a
// tsconfig.json `paths` alias to the real declaration file instead — a bare
// specifier, which ambient declarations can re-export from. ("export *" doesn't
// work inside an ambient "declare module" block, hence explicit names.) Remove
// once the framer-motion v11 upgrade (docs/todo.md Phase 4) replaces the pin.
declare module 'framer-motion' {
  export { motion, AnimatePresence } from 'framer-motion/internal-types';
}
