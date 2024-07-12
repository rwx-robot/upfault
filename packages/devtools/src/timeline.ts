/**
 * UpFault 时间线调试
 * 
 * 记录和分析应用生命周期事件、渲染性能、状态变更
 */

export type EventType = 
  | 'mount' 
  | 'update' 
  | 'unmount' 
  | 'effect' 
  | 'ref-change' 
  | 'computed-eval' 
  | 'lifecycle' 
  | 'error' 
  | 'custom';

export interface TimelineEvent {
  id: number;
  timestamp: number;
  type: EventType;
  componentUid?: number;
  componentName?: string;
  data: any;
  duration?: number;
  stackTrace?: string;
}

export interface Timeline {
  events: TimelineEvent[];
  maxEvents: number;
  isRecording: boolean;
  startTime: number;
}

let eventId = 0;
let timeline: Timeline = {
  events: [],
  maxEvents: 10000,
  isRecording: true,
  startTime: Date.now(),
};

/**
 * 创建时间线实例
 */
export function createTimeline(options: { maxEvents?: number } = {}): Timeline {
  return {
    events: [],
    maxEvents: options.maxEvents || 10000,
    isRecording: true,
    startTime: Date.now(),
  };
}

/**
 * 记录事件
 */
export function recordEvent(
  type: EventType,
  data: any,
  options: {
    componentUid?: number;
    componentName?: string;
    duration?: number;
    captureStack?: boolean;
  } = {}
): TimelineEvent {
  if (!timeline.isRecording) return null as any;

  const event: TimelineEvent = {
    id: ++eventId,
    timestamp: Date.now() - timeline.startTime,
    type,
    componentUid: options.componentUid,
    componentName: options.componentName,
    data,
    duration: options.duration,
    stackTrace: options.captureStack ? new Error().stack : undefined,
  };

  timeline.events.push(event);
  
  // 限制事件数量
  if (timeline.events.length > timeline.maxEvents) {
    timeline.events.shift();
  }

  return event;
}

/**
 * 获取时间线事件
 */
export function getTimelineEvents(filter?: {
  type?: EventType;
  componentUid?: number;
  since?: number;
  limit?: number;
}): TimelineEvent[] {
  let events = [...timeline.events];
  
  if (filter) {
    if (filter.type) {
      events = events.filter(e => e.type === filter.type);
    }
    if (filter.componentUid) {
      events = events.filter(e => e.componentUid === filter.componentUid);
    }
    if (filter.since) {
      events = events.filter(e => e.timestamp >= filter.since!);
    }
    if (filter.limit) {
      events = events.slice(-filter.limit);
    }
  }
  
  return events;
}

/**
 * 清空时间线
 */
export function clearTimeline(): void {
  timeline.events = [];
  eventId = 0;
  timeline.startTime = Date.now();
}

/**
 * 开始/停止记录
 */
export function setRecording(enabled: boolean): void {
  timeline.isRecording = enabled;
}

/**
 * 获取时间线统计信息
 */
export function getTimelineStats(): {
  totalEvents: number;
  eventTypes: Record<EventType, number>;
  totalDuration: number;
  avgEventDuration: number;
} {
  const stats: any = {
    totalEvents: timeline.events.length,
    eventTypes: {},
    totalDuration: 0,
    avgEventDuration: 0,
  };

  let totalDuration = 0;
  let durationCount = 0;

  for (const event of timeline.events) {
    stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
    if (event.duration !== undefined) {
      totalDuration += event.duration;
      durationCount++;
    }
  }

  stats.totalDuration = totalDuration;
  stats.avgEventDuration = durationCount > 0 ? totalDuration / durationCount : 0;

  return stats;
}

/**
 * 导出时间线数据 (JSON)
 */
export function exportTimeline(): string {
  return JSON.stringify({
    startTime: timeline.startTime,
    endTime: Date.now(),
    events: timeline.events,
    stats: getTimelineStats(),
  }, null, 2);
}

/**
 * 导入时间线数据
 */
export function importTimeline(json: string): void {
  const data = JSON.parse(json);
  timeline.events = data.events || [];
  timeline.startTime = data.startTime || Date.now();
  eventId = timeline.events.length > 0 
    ? Math.max(...timeline.events.map(e => e.id)) 
    : 0;
}

/**
 * 性能标记 - 便捷方法
 */
export const perf = {
  mark(name: string, data?: any): void {
    recordEvent('custom', { mark: name, ...data });
  },

  measure(name: string, startMark: string, endMark?: string): number {
    const events = getTimelineEvents({ type: 'custom' });
    const startEvent = events.find(e => e.data?.mark === startMark);
    const endTime = endMark 
      ? events.find(e => e.data?.mark === endMark)?.timestamp
      : Date.now() - timeline.startTime;
    
    if (startEvent && endTime !== undefined) {
      const duration = endTime - startEvent.timestamp;
      recordEvent('custom', { measure: name, duration, start: startMark, end: endMark });
      return duration;
    }
    return 0;
  },

  time(name: string): () => number {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      recordEvent('custom', { timing: name, duration });
      return duration;
    };
  },
};

/**
 * 生命周期追踪 - 便捷方法
 */
export const lifecycle = {
  mount(componentUid: number, componentName: string, duration?: number): void {
    recordEvent('mount', {}, { componentUid, componentName, duration, captureStack: true });
  },

  update(componentUid: number, componentName: string, duration?: number): void {
    recordEvent('update', {}, { componentUid, componentName, duration });
  },

  unmount(componentUid: number, componentName: string): void {
    recordEvent('unmount', {}, { componentUid, componentName });
  },

  lifecycle(hook: string, componentUid: number, componentName: string, duration?: number): void {
    recordEvent('lifecycle', { hook }, { componentUid, componentName, duration });
  },
};

/**
 * 响应式追踪 - 便捷方法
 */
export const reactivity = {
  refChange(refName: string, oldValue: any, newValue: any, componentUid?: number): void {
    recordEvent('ref-change', { refName, oldValue, newValue }, { componentUid });
  },

  computedEval(computedName: string, value: any, dependencies: string[], componentUid?: number): void {
    recordEvent('computed-eval', { computedName, value, dependencies }, { componentUid });
  },

  effectTrigger(effectId: number, deps: string[], componentUid?: number): void {
    recordEvent('effect', { effectId, deps }, { componentUid });
  },
};

/**
 * 错误追踪
 */
export const error = {
  capture(error: Error, componentUid?: number, componentName?: string, info?: string): void {
    recordEvent('error', { 
      message: error.message, 
      stack: error.stack,
      info 
    }, { componentUid, componentName, captureStack: true });
  },
};

/**
 * 获取全局时间线实例 (单例模式)
 */
export function getGlobalTimeline(): typeof timeline {
  return timeline;
}