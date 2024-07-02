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