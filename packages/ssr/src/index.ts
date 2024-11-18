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