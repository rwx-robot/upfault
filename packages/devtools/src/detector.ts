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
  performance: {
    mountTime: number;
    updateCount: number;
    lastUpdateTime: number;
  };
}

const UF_FAULT_MARKER = '__upfault_app__';
const UF_VERSION_KEY = '__upfault_version__';
const UF_COMPONENT_TREE_KEY = '__upfault_component_tree__';

/**
 * 检测页面是否运行 UpFault 应用
 */
export function detectUpFault(rootElement?: Element): DetectionResult {
  const searchRoot = rootElement || document;
  
  // 查找标记了 UpFault 的根元素
  const candidates = searchRoot.querySelectorAll(`[${UF_FAULT_MARKER}]`);
  
  if (candidates.length === 0) {
    return { detected: false };
  }
  
  const root = candidates.item(0)!;
  const version = root.getAttribute(UF_VERSION_KEY) || 'unknown';
  const componentCount = parseInt(root.getAttribute('data-uf-components') || '0', 10);
  
  return {
    detected: true,
    version,
    rootElement: root,
    componentCount,
  };
}

/**
 * 判断元素是否为 UpFault 应用根节点
 */
export function isUpFaultApp(element: Element): boolean {
  return element.hasAttribute(UF_FAULT_MARKER);
}

/**
 * 获取 UpFault 版本
 */
export function getUpFaultVersion(rootElement?: Element): string | null {
  const root = rootElement || document.querySelector(`[${UF_FAULT_MARKER}]`);
  return root?.getAttribute(UF_VERSION_KEY) || null;
}

/**
 * 获取应用详细信息
 */
export function getAppInfo(rootElement?: Element): AppInfo | null {
  const detection = detectUpFault(rootElement);
  if (!detection.detected || !detection.rootElement) {
    return null;
  }
  
  const root = detection.rootElement!;
  const treeData = root.getAttribute(UF_COMPONENT_TREE_KEY);
  
  return {
    version: detection.version || 'unknown',
    rootElement: root,
    componentTree: treeData ? JSON.parse(treeData) : null,
    reactivitySystem: {
      refCount: 0,
      computedCount: 0,
      effectCount: 0,
    },
    performance: {
      mountTime: parseInt(root.getAttribute('data-uf-mount-time') || '0', 10),
      updateCount: parseInt(root.getAttribute('data-uf-update-count') || '0', 10),
      lastUpdateTime: parseInt(root.getAttribute('data-uf-last-update') || '0', 10),
    },
  };
}

/**
 * 标记元素为 UpFault 应用根节点
 * 内部使用，由 runtime 调用
 */
export function markUpFaultApp(
  element: Element,
  version: string,
  options: {
    componentCount?: number;
    mountTime?: number;
  } = {}
): void {
  element.setAttribute(UF_FAULT_MARKER, 'true');
  element.setAttribute(UF_VERSION_KEY, version);
  if (options.componentCount !== undefined) {
    element.setAttribute('data-uf-components', String(options.componentCount));
  }
  if (options.mountTime !== undefined) {
    element.setAttribute('data-uf-mount-time', String(options.mountTime));
  }
}

/**
 * 更新应用信息
 */
export function updateAppInfo(
  element: Element,
  updates: {
    componentCount?: number;
    updateCount?: number;
    lastUpdateTime?: number;
    componentTree?: any;
  }
): void {
  if (updates.componentCount !== undefined) {
    element.setAttribute('data-uf-components', String(updates.componentCount));
  }
  if (updates.updateCount !== undefined) {
    element.setAttribute('data-uf-update-count', String(updates.updateCount));
  }
  if (updates.lastUpdateTime !== undefined) {
    element.setAttribute('data-uf-last-update', String(updates.lastUpdateTime));
  }
  if (updates.componentTree !== undefined) {
    element.setAttribute(UF_COMPONENT_TREE_KEY, JSON.stringify(updates.componentTree));
  }
}

/**
 * 移除 UpFault 标记
 */
export function unmarkUpFaultApp(element: Element): void {
  element.removeAttribute(UF_FAULT_MARKER);
  element.removeAttribute(UF_VERSION_KEY);
  element.removeAttribute('data-uf-components');
  element.removeAttribute('data-uf-mount-time');
  element.removeAttribute('data-uf-update-count');
  element.removeAttribute('data-uf-last-update');
  element.removeAttribute(UF_COMPONENT_TREE_KEY);
}

/**
 * 获取所有 UpFault 应用实例
 */
export function getAllUpFaultApps(): DetectionResult[] {
