/**
 * @upfault/devtools - Timeline 模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTimeline,
  recordEvent,
  getTimelineEvents,
  clearTimeline,
  type Timeline,
  type EventType,
} from '@upfault/devtools';

describe('Timeline', () => {
  // 每个测试用独立的 timeline 实例，避免模块级状态污染
  let tl: Timeline;

  beforeEach(() => {
    tl = createTimeline();
  });

  // ── createTimeline ─────────────────────────────────────────────────────────

  it('应创建指定容量的 Timeline', () => {
    const t = createTimeline({ maxEvents: 500 });
    expect(t.maxEvents).toBe(500);
    expect(t.isRecording).toBe(true);
    expect(t.events).toHaveLength(0);
  });

  it('默认容量为 10000', () => {
    expect(tl.maxEvents).toBe(10000);
  });

  // ── recordEvent ───────────────────────────────────────────────────────────

  it('应记录有效事件并返回 TimelineEvent', () => {
    const ev = recordEvent('mount', { component: 'App' }, {}, tl);
    expect(ev).not.toBeNull();
    expect(ev.id).toBeGreaterThan(0);
    expect(ev.type).toBe('mount');
    expect(ev.data).toEqual({ component: 'App' });
    expect(typeof ev.timestamp).toBe('number');
  });

  it('应支持所有 EventType', () => {
    const types: EventType[] = [
      'mount', 'update', 'unmount', 'effect',
      'ref-change', 'computed-eval', 'lifecycle', 'error', 'custom',
    ];
    for (const type of types) {
      const ev = recordEvent(type, { type }, {}, tl);
      expect(ev.type).toBe(type);
    }
  });

  it('options.componentUid 应附加到事件', () => {
    const ev = recordEvent('update', {}, { componentUid: 42 }, tl);
    expect(ev.componentUid).toBe(42);
  });

  it('options.componentName 应附加到事件', () => {
    const ev = recordEvent('update', {}, { componentName: 'Counter' }, tl);
    expect(ev.componentName).toBe('Counter');
  });

  it('options.duration 应附加到事件', () => {
    const ev = recordEvent('effect', {}, { duration: 16.5 }, tl);
    expect(ev.duration).toBe(16.5);
  });

  it('options.captureStack 应记录堆栈', () => {
    const ev = recordEvent('custom', {}, { captureStack: true }, tl);
    expect(ev.stackTrace).toBeDefined();
    expect(typeof ev.stackTrace).toBe('string');
  });

  it('超过 maxEvents 时应丢弃最旧事件（FIFO）', () => {
    // 验证 createTimeline 返回的是独立对象（不是模块级单例）
    const tl2 = createTimeline({ maxEvents: 3 });
    expect(tl2).not.toBe(tl); // 必须不是 beforeEach 的 tl
    expect(tl2.maxEvents).toBe(3);

    // 向 tl2 追加 5 个事件，FIFO 应只保留最后 3 条
    for (let i = 0; i < 5; i++) {
      recordEvent('custom', { i }, {}, tl2);
    }
    // 验证 FIFO 效果（只通过 tl2.events 直接访问，不经过 getTimelineEvents）
    expect(tl2.events).toHaveLength(3);
    // FIFO 应保留最后 3 个（连续的全局 ID，精确值取决于 eventId 前序增量）
    const ids = tl2.events.map(e => e.id);
    expect(ids[2] - ids[0]).toBe(2); // 三个连续 ID
    expect(ids[1] - ids[0]).toBe(1);
    expect(ids[2] - ids[1]).toBe(1);

    // 原有 tl（beforeEach 创建）不受影响
    expect(tl.events).toHaveLength(0);
  });

  it('无上限时应无限增长（maxEvents: 200）', () => {
    const t = createTimeline({ maxEvents: 200 });
    for (let i = 0; i < 100; i++) {
      recordEvent('custom', { i }, {}, t);
    }
    expect(t.events).toHaveLength(100);
  });

  it('空 data 应记录为 undefined 而非崩溃', () => {
    const ev = recordEvent('mount', undefined, {}, tl);
    expect(ev.data).toBeUndefined();
  });

  it('eventId 应全局递增', () => {
    const ev1 = recordEvent('mount', {}, {}, tl);
    const ev2 = recordEvent('update', {}, {}, tl);
    const ev3 = recordEvent('unmount', {}, {}, tl);
    expect(ev3.id).toBeGreaterThan(ev2.id);
    expect(ev2.id).toBeGreaterThan(ev1.id);
  });

  // ── getTimelineEvents ────────────────────────────────────────────────────

  it('无过滤时应返回所有事件', () => {
    recordEvent('mount', {}, {}, tl);
    recordEvent('update', {}, {}, tl);
    recordEvent('error', {}, {}, tl);
    expect(getTimelineEvents(undefined, tl)).toHaveLength(3);
  });

  it('filter.type 应只返回匹配类型', () => {
    recordEvent('mount', {}, {}, tl);
    recordEvent('update', {}, {}, tl);
    recordEvent('update', {}, {}, tl);
    recordEvent('unmount', {}, {}, tl);
    const updates = getTimelineEvents({ type: 'update' }, tl);
    expect(updates).toHaveLength(2);
    expect(updates.every(e => e.type === 'update')).toBe(true);
  });

  it('filter.componentUid 应只返回匹配组件', () => {
    recordEvent('update', {}, { componentUid: 1 }, tl);
    recordEvent('update', {}, { componentUid: 2 }, tl);
    recordEvent('update', {}, { componentUid: 1 }, tl);
    expect(getTimelineEvents({ componentUid: 1 }, tl)).toHaveLength(2);
  });

  it('filter.since 应只返回时间戳 >= since 的事件', () => {
    recordEvent('mount', {}, {}, tl);
    const ts = recordEvent('custom', {}, {}, tl).timestamp;
    recordEvent('unmount', {}, {}, tl);
    const after = getTimelineEvents({ since: ts }, tl);
    expect(after.length).toBeGreaterThanOrEqual(1);
    expect(after.every(e => e.timestamp >= ts)).toBe(true);
  });

  it('filter.limit 应截断结果', () => {
    for (let i = 0; i < 10; i++) recordEvent('custom', { i }, {}, tl);
    expect(getTimelineEvents({ limit: 3 }, tl)).toHaveLength(3);
  });

  it('filter.type + limit 应组合过滤', () => {
    for (let i = 0; i < 5; i++) recordEvent('update', { i }, {}, tl);
    for (let i = 0; i < 3; i++) recordEvent('mount', { i }, {}, tl);
    const result = getTimelineEvents({ type: 'update', limit: 2 }, tl);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.type === 'update')).toBe(true);
  });

  it('返回副本而非原始数组', () => {
    recordEvent('mount', {}, {}, tl);
    const events = getTimelineEvents(undefined, tl);
    events.push({} as any);
    expect(getTimelineEvents(undefined, tl)).toHaveLength(1);
  });

  // ── clearTimeline ────────────────────────────────────────────────────────

  it('clearTimeline 应清空指定实例', () => {
    recordEvent('mount', {}, {}, tl);
    recordEvent('update', {}, {}, tl);
    clearTimeline(tl);
    expect(getTimelineEvents(undefined, tl)).toHaveLength(0);
  });

  it('clearTimeline 不应影响其他实例', () => {
    const t2 = createTimeline();
    recordEvent('mount', {}, {}, tl);
    recordEvent('update', {}, {}, t2);
    clearTimeline(tl);
    expect(getTimelineEvents(undefined, tl)).toHaveLength(0);
    expect(getTimelineEvents(undefined, t2)).toHaveLength(1);
  });

  // ── 边界条件 ────────────────────────────────────────────────────────────

  it('空 filter 应等价于不过滤', () => {
    recordEvent('mount', {}, {}, tl);
    expect(getTimelineEvents({}, tl)).toHaveLength(1);
  });

  it('since=0 应返回所有事件', () => {
    recordEvent('mount', {}, {}, tl);
    recordEvent('update', {}, {}, tl);
    expect(getTimelineEvents({ since: 0 }, tl)).toHaveLength(2);
  });

  it('多次 getTimelineEvents 不会消耗事件', () => {
    recordEvent('mount', {}, {}, tl);
    getTimelineEvents(undefined, tl);
    getTimelineEvents(undefined, tl);
    expect(getTimelineEvents(undefined, tl)).toHaveLength(1);
  });

  it('isRecording=false 时 recordEvent 返回 null', () => {
    tl.isRecording = false;
    expect(recordEvent('mount', {}, {}, tl)).toBeNull();
  });
});
