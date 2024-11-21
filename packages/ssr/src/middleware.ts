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
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  body?: any;
}

export interface SSRResponse {
  status(code: number): this;
  setHeader(name: string, value: string): this;
  send(html: string): void;