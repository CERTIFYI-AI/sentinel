/// <reference types="vite/client" />

// @fontsource-variable packages ship CSS only — no type declarations needed.
// This stub prevents TS2882 (side-effect import of untyped module).
declare module '@fontsource-variable/outfit' {
  const _: string;
  export default _;
}
declare module '@fontsource-variable/outfit/index.css' {
  const _: string;
  export default _;
}