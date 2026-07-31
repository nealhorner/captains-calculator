// framer-motion 3.10.6's package.json "exports" map has no "types" condition, so
// moduleResolution "bundler"/"node16" can't find its declarations (legacy "node"
// resolution ignored "exports" for types and found them anyway). Restores the
// implicit-any behavior this repo already had under TS 4.9 until the framer-motion
// v11 upgrade (docs/todo.md Phase 4) replaces the pin with a version that fixes this.
declare module "framer-motion";
