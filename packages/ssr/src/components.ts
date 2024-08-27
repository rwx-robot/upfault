/**
 * UpFault SSR - Streaming Rendering
 * 
 * Supports HTTP streaming response, Suspense boundaries, async component streaming
 */

import { h, type VNode, type ComponentInstance } from '@upfault/runtime';
import { Priority, type SchedulerTask } from '@upfault/scheduler';
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
  pipeToWebWritable(writable: WritableStream): Promise<void>;
  abort(): void;
}

export interface SuspenseBoundary {
  fallback: VNode | string | (() => VNode | string);
  onResolve?: (data: any) => void;
