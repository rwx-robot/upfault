declare module 'esbuild' {
  export interface BuildOptions {
    entryPoints: string | string[];
    bundle?: boolean;
    outdir?: string;
    platform?: 'browser' | 'node' | 'neutral';
    format?: 'iife' | 'cjs' | 'esm';
    target?: string | string[];
    minify?: boolean;