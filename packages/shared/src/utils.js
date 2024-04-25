/**
 * UpFault Utilities - 通用工具函数
 *
 * 纯函数、无副作用、可 Tree-shaking
 */
/**
 * 判断两个值是否为同一节点 (用于 Diff)
 */
export function isSameNode(a, b) {
    return a.type === b.type && a.key === b.key;
}
/**
 * 判断是否为对象
 */
export function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/**
 * 判断是否为函数
 */
export function isFunction(value) {
    return typeof value === 'function';
}
/**
 * 判断是否为字符串
 */
export function isString(value) {
    return typeof value === 'string';
}
/**
 * 判断是否为数字
 */
export function isNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value);
}
/**
 * 判断是否为 Promise
 */
export function isPromise(value) {
    return isObject(value) && isFunction(value.then);
}
/**
 * 判断是否为 Ref
 */
export function isRef(value) {
    return isObject(value) && value.__v_isRef === true;
}
/**
 * 判断是否为 ComputedRef
 */
export function isComputedRef(value) {
    return isObject(value) && value.__v_isComputed === true;
}
/**
 * 判断是否为响应式对象
 */
export function isReactive(value) {
    return isObject(value) && value.__v_isReactive === true;
}
/**
 * 判断是否为只读响应式
 */
export function isReadonly(value) {
    return isObject(value) && value.__v_isReadonly === true;
}
/**
 * 判断是否为 VNode
 */
export function isVNode(value) {
    return isObject(value) && '__v_isVNode' in value;
}
/**
 * 空函数
 */
export const NOOP = () => { };
/**
 * 标识函数
 */
export const IDENTITY = (v) => v;
/**
 * 判断值是否变化 (用于响应式比较)
 */
export function hasChanged(a, b) {
    return a !== b && (a === a || b === b); // NaN 检查
}
/**
 * 安全的数组推平
 */
export function flatten(arr) {
    return arr.reduce((acc, val) => {
        return acc.concat(Array.isArray(val) ? flatten(val) : [val]);
    }, []);
}
/**
 * 生成唯一 ID (单调递增)
 */
let uidCounter = 0;
export function generateId(prefix = '') {
    return `${prefix}${++uidCounter}_${Date.now().toString(36)}`;
}
/**
 * 生成唯一数字 ID
 */
let numericIdCounter = 0;
export function generateNumericId() {
    return ++numericIdCounter;
}
/**
 * 深度克隆 (仅支持 JSON 兼容类型)
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * 对象浅拷贝合并
 */
export function mergeObjects(target, source) {
    return { ...target, ...source };
}
/**
 * 数组去重 (保持顺序)
 */
export function unique(arr) {
    return [...new Set(arr)];
}
/**
 * 数组分块
 */
export function chunk(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}
/**
 * 防抖
 */
export function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
/**
 * 节流
 */
export function throttle(fn, limit) {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
/**
 * 扁平化树结构 (深度优先)
 */
export function flattenTree(nodes, getChildren) {
    const result = [];
    const stack = [...nodes].reverse();
    while (stack.length) {
        const node = stack.pop();
        result.push(node);
        const children = getChildren(node);
        if (children?.length) {
            stack.push(...children.reverse());
        }
    }
    return result;
}
/**
 * 遍历树 (广度优先)
 */
export function traverseTreeBFS(root, getChildren, visitor) {
    const queue = [[root, 0]];
    while (queue.length) {
        const [node, depth] = queue.shift();
        const shouldContinue = visitor(node, depth);
        if (shouldContinue === false)
            break;
        const children = getChildren(node);
        if (children?.length) {
            for (const child of children) {
                queue.push([child, depth + 1]);
            }
        }
    }
}
/**
 * 性能计时器
 */
export class PerformanceTimer {
    constructor() {
        this.startTime = 0;
        this.endTime = 0;
        this.running = false;
    }
    start() {
        this.startTime = performance.now();
        this.running = true;
        return this;
    }
    stop() {
        this.endTime = performance.now();
        this.running = false;
        return this.endTime - this.startTime;
    }
    get elapsed() {
        if (this.running) {
            return performance.now() - this.startTime;
        }
        return this.endTime - this.startTime;
    }
    reset() {
        this.startTime = 0;
        this.endTime = 0;
        this.running = false;
        return this;
    }
}
/**
 * 简单的 LRU 缓存
 */
export class LRUCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // 移到最后 (最近使用)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.maxSize) {
            // 删除最旧的
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
        return this;
    }
    has(key) {
        return this.cache.has(key);
    }