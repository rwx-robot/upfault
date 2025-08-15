/**
 * 常量折叠：编译期求值纯常量表达式
 *
 * 安全性设计（重要）：
 * - **不使用 eval / new Function**，避免任意代码执行
 * - 词法层限制：只接受数字/字符串/布尔/null 字面量与运算符，
 *   任何标识符（变量、成员访问、函数调用）一律拒绝折叠
 * - 语义对齐 JS：字符串 + 拼接、数字运算、短路求值、三元
 */

import type { FoldResult } from './types';

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'null' }
  | { kind: 'op'; value: string };

const OPERATORS = [
  '**', '===', '!==', '==', '!=', '<=', '>=', '&&', '||', '??',
  '+', '-', '*', '/', '%', '<', '>', '!', '(', ')', '?', ':',
];

/**
 * 词法分析。遇到非法字符或标识符（非 true/false/null/undefined）返回 null，
 * 表示该表达式不可折叠。
 */
function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i]!;

    // 空白
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // 字符串
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let value = '';
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < src.length) {
          // 转义序列：仅支持常见几种，其余保留原字符
          const esc = src[i + 1]!;
          if (esc === 'n') value += '\n';
          else if (esc === 't') value += '\t';
          else if (esc === 'r') value += '\r';
          else value += esc;
          i += 2;
          continue;
        }
        value += src[i]!;
        i++;
      }
      if (i >= src.length) return null; // 未闭合
      i++; // 跳过闭合引号
      tokens.push({ kind: 'str', value });
      continue;
    }

    // 数字（含小数、指数、十六进制）
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(src.slice(i));
      if (!m) return null;
      tokens.push({ kind: 'num', value: Number(m[0]) });
      i += m[0].length;
      continue;
    }

    // 标识符：仅允许字面量关键字
    if (/[A-Za-z_$]/.test(ch)) {
      const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(src.slice(i));
      if (!m) return null;
      const word = m[0];
      if (word === 'true') tokens.push({ kind: 'bool', value: true });
      else if (word === 'false') tokens.push({ kind: 'bool', value: false });
      else if (word === 'null' || word === 'undefined') tokens.push({ kind: 'null' });
      else return null; // 变量/函数调用 → 不可折叠
      i += word.length;
      continue;
    }

    // 运算符（长运算符优先）
    const op = OPERATORS.find((o) => src.startsWith(o, i));
    if (!op) return null;
    tokens.push({ kind: 'op', value: op });
    i += op.length;
  }

  return tokens;
}

/**
 * 递归下降求值。
 * 任何语法错误或不可折叠情况都抛出一个“放弃”信号，由 tryFoldExpression 捕获。
 */
class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private eatOp(op: string): boolean {
    const t = this.peek();
    if (t && t.kind === 'op' && t.value === op) {
      this.pos++;
      return true;
    }
    return false;
  }

  private expectOp(op: string): void {
    if (!this.eatOp(op)) throw new Error('unexpected token');
  }

  parse(): string | number | boolean | null {
    const value = this.parseTernary();
    if (this.pos !== this.tokens.length) throw new Error('trailing tokens');
    return value;
  }

  private parseTernary(): string | number | boolean | null {
    const cond = this.parseNullish();
    if (this.eatOp('?')) {
      const a = this.parseTernary();
      this.expectOp(':');
      const b = this.parseTernary();
      return truthy(cond) ? a : b;
    }
    return cond;
  }

  private parseNullish(): string | number | boolean | null {
    let left = this.parseLogicalOr();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && t.value === '??') {
        this.pos++;
        const right = this.parseLogicalOr();
        left = left === null ? right : left;
        continue;
      }
      return left;
    }
  }

  private parseLogicalOr(): string | number | boolean | null {
    // JS 语义：`a || b` 返回 a（若真）否则 b，两侧 token 都必须消耗，
    // 否则 parse() 的 “trailing tokens” 检查会放弃折叠
    let left = this.parseLogicalAnd();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && t.value === '||') {
        this.pos++;
        const right = this.parseLogicalAnd();
        left = truthy(left) ? left : right;
        continue;
      }
      return left;
    }
  }

  private parseLogicalAnd(): string | number | boolean | null {
    let left = this.parseEquality();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && t.value === '&&') {
        this.pos++;
        const right = this.parseEquality();
        left = truthy(left) ? right : left;
        continue;
      }
      return left;
    }
  }

  private parseEquality(): string | number | boolean | null {
    let left = this.parseRelational();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.value === '===' || t.value === '!==' || t.value === '==' || t.value === '!=')) {
        this.pos++;
        const right = this.parseRelational();
        // === / !== 必须严格比较；== / != 才是宽松比较
        const eq =
          t.value === '==='
            ? strictEquals(left, right)
            : t.value === '!=='
              ? !strictEquals(left, right)
              : looseEquals(left, right);
        left = t.value.startsWith('=') ? eq : !eq;
        continue;
      }
      return left;
    }
  }

  private parseRelational(): string | number | boolean | null {
    let left = this.parseAdditive();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.value === '<' || t.value === '>' || t.value === '<=' || t.value === '>=')) {
        this.pos++;
        const right = this.parseAdditive();
        left = compare(left, right, t.value);
        continue;
      }
      return left;
    }
  }

  private parseAdditive(): string | number | boolean | null {
    let left = this.parseMultiplicative();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.pos++;
        const right = this.parseMultiplicative();
        if (t.value === '+') {
          // 字符串拼接优先（JS 语义）
          if (typeof left === 'string' || typeof right === 'string') {
            left = toStr(left) + toStr(right);
          } else {
            left = Number(left) + Number(right);
          }
        } else {
          left = Number(left) - Number(right);
        }
        continue;
      }
      return left;
    }
  }

  private parseMultiplicative(): string | number | boolean | null {
    let left = this.parseExponential();
    for (;;) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        this.pos++;
        const right = this.parseExponential();
        const a = Number(left);
        const b = Number(right);
        if (t.value === '*') left = a * b;
        else if (t.value === '/') left = a / b;
        else left = a % b;
        continue;
      }
      return left;
    }
  }

  /**
   * 幂运算：** 优先级高于 * / %，且右结合（2 ** 3 ** 2 === 2 ** 9）。
   * 与 * / % 混在同一层会得到错误结果（如 2 * 3 ** 2 应为 18 而非 36）。
   */
  private parseExponential(): string | number | boolean | null {
    const base = this.parseUnary();
    const t = this.peek();
    if (t?.kind === 'op' && t.value === '**') {
      this.pos++;
      const exponent = this.parseExponential(); // 右结合
      return Number(base) ** Number(exponent);
    }
    return base;
  }

  private parseUnary(): string | number | boolean | null {
    const t = this.peek();
    if (t?.kind === 'op') {
      if (t.value === '!') {
        this.pos++;
        return !truthy(this.parseUnary());
      }
      if (t.value === '-') {
        this.pos++;
        return -Number(this.parseUnary());
      }
      if (t.value === '+') {
        this.pos++;
        return Number(this.parseUnary());
      }
    }
    return this.parsePrimary();
  }

  private parsePrimary(): string | number | boolean | null {
    const t = this.peek();
    if (!t) throw new Error('unexpected end');

    if (t.kind === 'num' || t.kind === 'str' || t.kind === 'bool') {
      this.pos++;
      return t.value;
    }
    if (t.kind === 'null') {
      this.pos++;
      return null;
    }
    if (t.kind === 'op' && t.value === '(') {
      this.pos++;
      const value = this.parseTernary();
      this.expectOp(')');
      return value;
    }
    throw new Error('unexpected token');
  }
}

function truthy(v: string | number | boolean | null): boolean {
  return Boolean(v);
}

function toStr(v: string | number | boolean | null): string {
  return v === null ? 'null' : String(v);
}

function strictEquals(a: string | number | boolean | null, b: string | number | boolean | null): boolean {
  // 严格相等 ===（常量表达式无引用类型，语义等价于直接比较）
  return (a as unknown) === (b as unknown);
}

function looseEquals(a: string | number | boolean | null, b: string | number | boolean | null): boolean {
  // 常量表达式场景：使用宽松比较即可（无引用类型）
  // eslint-disable-next-line eqeqeq
  return (a as unknown) == (b as unknown);
}

function compare(
  a: string | number | boolean | null,
  b: string | number | boolean | null,
  op: string,
): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    if (op === '<') return a < b;
    if (op === '>') return a > b;
    if (op === '<=') return a <= b;
    return a >= b;
  }
  const x = Number(a);
  const y = Number(b);
  if (op === '<') return x < y;
  if (op === '>') return x > y;
  if (op === '<=') return x <= y;
  return x >= y;
}

/**
 * 尝试折叠表达式。不可折叠（含标识符、语法错误、结果非原始类型）时返回
 * `{ folded: false }`，调用方应保持原样 —— 绝不因优化改变语义。
 */
export function tryFoldExpression(expr: string): FoldResult {
  const trimmed = expr.trim();
  if (trimmed === '') return { folded: false };

  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length === 0) return { folded: false };

  try {
    const value = new Parser(tokens).parse();
    // 仅接受可安全内联的原始类型
    if (value === null) return { folded: false };
    if (typeof value === 'number' && !Number.isFinite(value)) return { folded: false };
    return { folded: true, value };
  } catch {
    return { folded: false };
  }
}

/** 将折叠结果渲染为模板中的字面量文本 */
export function renderFoldedValue(value: string | number | boolean): string {
  return typeof value === 'string' ? value : String(value);
}
