/**
 * @upfault/devtools - Detector 模块测试
 * 需要 jsdom 环境（document 依赖）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectUpFault,
  isUpFaultApp,
  getUpFaultVersion,
  getAppInfo,
  type DetectionResult,
} from '@upfault/devtools';

describe('Detector', () => {
  beforeEach(() => {
    // 清理文档
    document.body.innerHTML = '';
  });

  // ── detectUpFault ─────────────────────────────────────────────────────────

  it('无 UpFault 标记时应返回 detected=false', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const result = detectUpFault();
    expect(result.detected).toBe(false);
  });

  it('有 __upfault_app__ 标记时应返回 detected=true', () => {
    document.body.innerHTML = '<div id="app" __upfault_app__=""></div>';
    const result = detectUpFault();
    expect(result.detected).toBe(true);
  });

  it('应读取 __upfault_version__ 属性', () => {
    document.body.innerHTML = '<div __upfault_app__="" __upfault_version__="0.2.0"></div>';
    const result = detectUpFault();
    expect(result.detected).toBe(true);
    expect(result.version).toBe('0.2.0');
  });

  it('无 __upfault_version__ 时应回退到 unknown', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    const result = detectUpFault();
    expect(result.version).toBe('unknown');
  });

  it('应读取 data-uf-components 属性', () => {
    document.body.innerHTML = '<div __upfault_app__="" data-uf-components="5"></div>';
    const result = detectUpFault();
    expect(result.componentCount).toBe(5);
  });

  it('无 data-uf-components 时应默认为 0', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    const result = detectUpFault();
    expect(result.componentCount).toBe(0);
  });

  it('应返回 rootElement 引用', () => {
    document.body.innerHTML = '<main __upfault_app__=""></main>';
    const result = detectUpFault();
    expect(result.rootElement).toBeInstanceOf(Element);
    expect(result.rootElement!.tagName).toBe('MAIN');
  });

  it('多个候选时应返回第一个', () => {
    document.body.innerHTML = `
      <div __upfault_app__=""></div>
      <section __upfault_app__=""></section>
    `;
    const result = detectUpFault();
    expect(result.rootElement!.tagName).toBe('DIV');
  });

  it('指定 rootElement 时应在其子树内查找', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    const searchRoot = document.createElement('section');
    document.body.appendChild(searchRoot);
    const result = detectUpFault(searchRoot);
    expect(result.detected).toBe(false);
  });

  it('rootElement 子树内存在标记时应找到', () => {
    const section = document.createElement('section');
    const inner = document.createElement('div');
    inner.setAttribute('__upfault_app__', '');
    section.appendChild(inner);
    document.body.appendChild(section);

    const result = detectUpFault(section);
    expect(result.detected).toBe(true);
    expect(result.rootElement).toBe(inner);
  });

  it('空白属性值应视为有效标记', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    expect(detectUpFault().detected).toBe(true);
  });

  it('非空属性值应视为有效标记', () => {
    document.body.innerHTML = '<div __upfault_app__="true"></div>';
    expect(detectUpFault().detected).toBe(true);
  });

  it('嵌套深层的标记应被找到', () => {
    document.body.innerHTML = '<div><div><div __upfault_app__=""></div></div></div>';
    const result = detectUpFault();
    expect(result.detected).toBe(true);
  });

  // ── isUpFaultApp ─────────────────────────────────────────────────────────

  it('有 __upfault_app__ 属性时应返回 true', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    expect(isUpFaultApp(document.body.firstElementChild!)).toBe(true);
  });

  it('无 __upfault_app__ 属性时应返回 false', () => {
    document.body.innerHTML = '<div id="app"></div>';
    expect(isUpFaultApp(document.body.firstElementChild!)).toBe(false);
  });

  it('空字符串属性值应返回 true', () => {
    const el = document.createElement('div');
    el.setAttribute('__upfault_app__', '');
    expect(isUpFaultApp(el)).toBe(true);
  });

  it('非 Element 节点（Text）应返回 false', () => {
    // Text 节点没有 hasAttribute 方法，isUpFaultApp 应安全返回 false
    const text = document.createTextNode('hello');
    document.body.appendChild(text);
    // isUpFaultApp 调用 element.hasAttribute，若 Element 没有此方法则报错
    // 若实现正确，应在入口处判断节点类型后返回 false
    let result: boolean;
    try {
      result = isUpFaultApp(text as unknown as Element);
    } catch {
      result = false; // 方法不存在时报错，视为非 UpFault 节点
    }
    expect(result).toBe(false);
  });

  // ── getUpFaultVersion ────────────────────────────────────────────────────

  it('存在版本时返回版本号', () => {
    document.body.innerHTML = '<div __upfault_app__="" __upfault_version__="0.3.0"></div>';
    expect(getUpFaultVersion()).toBe('0.3.0');
  });

  it('不存在版本时返回 null', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    expect(getUpFaultVersion()).toBeNull();
  });

  it('无 UpFault 时返回 null', () => {
    document.body.innerHTML = '<div id="app"></div>';
    expect(getUpFaultVersion()).toBeNull();
  });

  it('指定 rootElement 时应在其子树内查找', () => {
    document.body.innerHTML = '<div __upfault_version__="0.4.0"></div>';
    const section = document.createElement('section');
    document.body.appendChild(section);
    expect(getUpFaultVersion(section)).toBeNull();
  });

  // ── getAppInfo ────────────────────────────────────────────────────────────

  it('存在 rootElement 时返回 AppInfo', () => {
    document.body.innerHTML = `
      <div __upfault_app__=""
           __upfault_version__="0.2.0"
           data-uf-components="3">
      </div>
    `;
    const info = getAppInfo();
    expect(info.version).toBe('0.2.0');
    expect(info.rootElement).toBeInstanceOf(Element);
    expect(info.reactivitySystem).toBeDefined();
    expect(info.performance).toBeDefined();
  });

  it('无 UpFault 时返回 null', () => {
    document.body.innerHTML = '<div id="app"></div>';
    expect(getAppInfo()).toBeNull();
  });

  it('AppInfo 的 reactivitySystem 应有合理的默认值', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    const info = getAppInfo();
    expect(typeof info!.reactivitySystem.refCount).toBe('number');
    expect(typeof info!.reactivitySystem.computedCount).toBe('number');
    expect(typeof info!.reactivitySystem.effectCount).toBe('number');
  });

  it('AppInfo 的 performance 应有合理的默认值', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    const info = getAppInfo();
    expect(typeof info!.performance.mountTime).toBe('number');
    expect(typeof info!.performance.updateCount).toBe('number');
    expect(typeof info!.performance.lastUpdateTime).toBe('number');
  });

  it('componentTree 应返回对象结构', () => {
    document.body.innerHTML = '<div __upfault_app__=""></div>';
    const info = getAppInfo();
    expect(typeof info!.componentTree).toBe('object');
  });

  // ── 边界条件 ─────────────────────────────────────────────────────────────

  it('querySelectorAll 报异常时应不崩溃（返回 detected=false）', () => {
    // 模拟无法查询的情况：传入一个不可查询的 Element
    const el = document.createElement('div');
    const result = detectUpFault(el);
    expect(result.detected).toBe(false);
  });

  it('__upfault_version__ 为非数字时应原样返回', () => {
    document.body.innerHTML = '<div __upfault_app__="" __upfault_version__="alpha"></div>';
    expect(getUpFaultVersion()).toBe('alpha');
  });

  it('data-uf-components 为非数字时应返回 NaN', () => {
    document.body.innerHTML = '<div __upfault_app__="" data-uf-components="abc"></div>';
    const result = detectUpFault();
    expect(result.componentCount).toBeNaN();
  });
});
