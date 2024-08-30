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
  onReject?: (error: Error) => void;
  timeout?: number;
}

/**
 * Create streaming renderer
 */
export function createStreamRenderer(options: StreamingOptions = {}): StreamRenderer {
  let aborted = false;
  let shellSent = false;
  
  return {
    render(vnode: VNode): ReadableStream {
      return new ReadableStream({
        async start(controller) {
          try {
            if (!shellSent) {
              const shell = renderShell(vnode);
              controller.enqueue(new TextEncoder().encode(shell));
              shellSent = true;
            }
            
            await renderStreaming(vnode, (chunk) => {
              controller.enqueue(new TextEncoder().encode(chunk));
            });
            
            controller.enqueue(new TextEncoder().encode('<!--stream-end-->'));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });
    },
    async pipeToNodeWritable(writable: NodeJS.WritableStream): Promise<void> {
      const stream = this.render({ type: VNodeType.ELEMENT, tag: 'div', props: {}, children: [] } as any);
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await new Promise<void>((resolve, reject) => {
            writable.write(value, (err) => err ? reject(err) : resolve());
          });
        }
      } finally {
        reader.releaseLock();
        writable.end();
      }
    },
    async pipeToWebWritable(writable: WritableStream): Promise<void> {
      const stream = this.render({ 
        type: VNodeType.ELEMENT, 
        tag: 'div', 
        props: {}, 