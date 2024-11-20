/**
 * UpFault SSR - Middleware Integration
 * 
 * Provides Express, Koa, Fastify, and native Node.js HTTP server SSR middleware
 */

import { renderToString, renderToNodeStream, pipeToNodeWritable, type SSRContext, type RenderOptions } from './render';
import { h } from '@upfault/runtime';

export interface SSRRequest {
  url: string;
  method: string;