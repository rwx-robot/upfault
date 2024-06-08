/**
 * UpFault 框架检测器
 * 
 * 自动检测页面中是否运行 UpFault 应用，获取版本信息
 */

export interface DetectionResult {
  detected: boolean;
  version?: string;
  rootElement?: Element;
  componentCount?: number;
  rootComponent?: any;
}

export interface AppInfo {
  version: string;
  rootElement: Element;
  componentTree: any;
  reactivitySystem: {
    refCount: number;
    computedCount: number;
    effectCount: number;
  };