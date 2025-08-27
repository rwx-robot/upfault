/**
 * 偏移量 ↔ ESLint 位置 映射
 *
 * 编译器 parser 给的是「相对模板块」的 offset，把它换算成「相对 .uf 文件」的
 * 行列时，用相对偏移累加极易在模板块不换行（`<template><p>x</p></template>`）
 * 这类写法上出错。这里统一改成：**先把偏移还原成文件绝对偏移，再由行首索引表
 * 直接查行列** —— 只有一条换算规则，没有分行讨论。
 */

import type { LintLoc, LintPosition, LintRange } from './ast';

export class PositionMapper {
  /** lineStarts[i] = 第 i+1 行在文件中的起始偏移 */
  private readonly lineStarts: number[];
  readonly length: number;

  constructor(private readonly source: string) {
    const starts = [0];
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\n') starts.push(i + 1);
    }
    this.lineStarts = starts;
    this.length = source.length;
  }

  /** 偏移 → 位置（行 1-based、列 0-based） */
  position(offset: number): LintPosition {
    const clamped = Math.max(0, Math.min(offset, this.length));
    // 二分查找最后一个 lineStart <= clamped
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid]! <= clamped) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: clamped - this.lineStarts[lo]! };
  }

  loc(start: number, end: number): LintLoc {
    return { start: this.position(start), end: this.position(Math.max(start, end)) };
  }

  range(start: number, end: number): LintRange {
    return [Math.max(0, start), Math.max(start, end)];
  }

  text(start: number, end: number): string {
    return this.source.slice(start, end);
  }

  /** 整文件范围 */
  whole(): LintRange {
    return [0, this.length];
  }
}
