/**
 * UpFault SSR - Streaming Rendering
 * 
 * Supports HTTP streaming response, Suspense boundaries, async component streaming
 */

import { type VNode } from '@upfault/runtime';
import { VNodeType } from '@upfault/shared';

export interface StreamingOptions {
  bootstrapScripts?: string[];
  inlineStyles?: boolean;
  preloadModules?: boolean;
  suspenseFallback?: string;
  onShellReady?: () => void;
  onAllReady?: () => void;
  onError?: (error: Error) => void;
}

export interface StreamRenderer {
  render(vnode: VNode): ReadableStream;
  pipeToNodeWritable(writable: NodeJS.WritableStream): Promise<void>;