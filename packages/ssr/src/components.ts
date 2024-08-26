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
