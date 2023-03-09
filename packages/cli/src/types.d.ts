declare module 'esbuild' {
  export interface BuildOptions {
    entryPoints: string | string[];
    bundle?: boolean;
    outdir?: string;
    platform?: 'browser' | 'node' | 'neutral';
    format?: 'iife' | 'cjs' | 'esm';
    target?: string | string[];
    minify?: boolean;
    sourcemap?: boolean | 'inline' | 'external' | 'linked';
    splitting?: boolean;
    outExtension?: { '.js': string; '.css': string };
    loader?: Record<string, 'js' | 'jsx' | 'ts' | 'tsx' | 'css' | 'json' | 'text' | 'base64' | 'file' | 'dataurl' | 'empty' | 'copy' | 'binary'>;
    define?: Record<string, string>;
    external?: string[];
    plugins?: any[];
    [key: string]: any;
  }

  export interface BuildResult {
    errors: { text: string; location?: any }[];
    warnings: any[];
    metafile?: any;
    outputFiles?: { path: string; contents: Uint8Array }[];