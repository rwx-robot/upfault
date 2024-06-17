/**
 * @upfault/devtools - UpFault 开发工具
 * 
 * 提供框架检测、组件检查、时间线调试等功能
 * 版本: 0.2.0
 */

// 框架检测器
export {
  detectUpFault,
  isUpFaultApp,
  getUpFaultVersion,
  getAppInfo,
} from './detector';

export type { DetectionResult, AppInfo } from './detector';

// 组件检查器