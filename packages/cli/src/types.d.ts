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
  }

  export function build(options: BuildOptions): Promise<BuildResult>;

  export interface ServeOptions {
    port?: number;
    host?: string;
    servedir?: string;
    keyfile?: string;
    certfile?: string;
    fallback?: string;
    onRequest?: (args: any) => void;
  }

  export interface ServeResult {
    port: number;
    host: string;
    stop(): Promise<void>;
  }

  export function serve(serveOptions: ServeOptions, buildOptions: BuildOptions): Promise<ServeResult>;

  export function context(options: BuildOptions): Promise<{ build: () => Promise<BuildResult>; watch: () => Promise<any>; serve: (options: ServeOptions) => Promise<ServeResult>; dispose: () => Promise<void> }>;
}

declare module 'commander' {
  export class Command {
    name(name: string): this;
    description(desc: string): this;
    version(ver: string, flags?: string): this;
    option(flags: string, desc: string, defaultValue?: any): this;
    argument(name: string, desc: string, defaultValue?: any): this;
    action(handler: (...args: any[]) => Promise<void>): this;
    parseAsync(argv: string[]): Promise<this>;
    parse(argv: string[]): this;
    command(name: string, desc?: string, opts?: { isDefault?: boolean }): Command;
    addCommand(cmd: Command): this;
  }
}

declare module 'chokidar' {
  export interface FSWatcher {
    on(event: string, listener: (...args: any[]) => void): this;
    close(): Promise<void>;
  }

  export function watch(paths: string | string[], options?: any): FSWatcher;
}
