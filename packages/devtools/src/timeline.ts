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