/**
 * @upfault/ssr - UpFault 服务端渲染
 * 
 * 提供服务端渲染、流式渲染、水合等功能
 * 版本: 0.2.0
 */

// 核心渲染
export {
  renderToString,
  renderToNodeStream,
  renderToWebStream,
  pipeToNodeWritable,
  pipeToWebWritable,
} from './render';

export type { SSRContext, RenderOptions } from './render';

// 流式渲染
export {
  renderToPipeableStream,
  renderToReadableStream,
  createStreamRenderer,
} from './streaming';

export type { StreamingOptions, StreamRenderer } from './streaming';

// 客户端水合
export {
  hydrate,
  hydrateRoot,
  hydrateNodeStream,
  hydrateWebStream,
  partialHydrate,
  lazyHydrate,
  
  isHydrated,
  markHydrated,
  getHydrationState,
} from './hydration';

export type { HydrationContext, HydrationOptions } from './hydration';

// 中间件集成
export {
  createSSRMiddleware,
  createDevMiddleware,
  createProdMiddleware,
} from './middleware';

export type { MiddlewareOptions, SSRRequest, SSRResponse } from './middleware';

// 组件导出
export { defineAsyncComponent, Suspense, Teleport, KeepAlive } from './components';

// 版本信息
export const VERSION = '0.2.0';
export const PACKAGE_NAME = '@upfault/ssr';
