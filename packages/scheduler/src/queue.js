/**
 * UpFault Scheduler - Priority Queue (Min Heap)
 *
 * 用于任务调度的优先队列，支持 O(log n) 入队/出队
 * 基于数组实现的最小堆
 */
/**
 * 优先队列实现 - 最小堆
 * 数值越小优先级越高 (IMMEDIATE=0 最高)
 */
export class PriorityQueue {
    constructor(comparator) {
        this.heap = [];
        this.comparator = comparator || this.defaultCompare;
    }
    /**
     * 默认比较函数：优先级数值越小越靠前
     * 同优先级按过期时间排序，再按 ID 排序保证稳定性
     */
    defaultCompare(a, b) {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        if (a.expirationTime !== b.expirationTime) {
            return a.expirationTime - b.expirationTime;
        }
        return a.id - b.id;
    }
    /**
     * 入队 - O(log n)
     */
    push(task) {
        this.heap.push(task);
        this.siftUp(this.heap.length - 1);
    }
    /**
     * 出队最高优先级任务 - O(log n)
     */
    pop() {
        if (this.heap.length === 0)
            return null;
        const top = this.heap[0];
        if (!top)
            return null; // Explicit null check
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.siftDown(0);
        }
        return top;
    }
    /**
     * 查看最高优先级任务 - O(1)
     */
    peek() {
        return this.heap[0] ?? null;
    }
    /**
     * 检查是否有更高优先级任务
     */
    hasHigherPriority(priority) {
        const top = this.peek();
        return top !== null && top.priority < priority;
    }
    /**
     * 移除特定任务 - O(n)
     */
    remove(task) {
        const index = this.heap.findIndex(t => t.id === task.id);
        if (index === -1)
            return false;
        const end = this.heap.pop();
        if (index !== this.heap.length) {
            this.heap[index] = end;
            this.siftDown(index);
            this.siftUp(index);
        }
        return true;
    }
    /**
     * 清空队列
     */
    clear() {
        this.heap.length = 0;
    }
    get size() {
        return this.heap.length;
    }
    get isEmpty() {
        return this.heap.length === 0;
    }
    /**
     * 获取所有任务 (用于调试/统计)
     */
    toArray() {
        return [...this.heap];
    }
    // ===== 堆操作内部方法 =====
    siftUp(index) {
        while (index > 0) {
            const parentIndex = (index - 1) >> 1;
            if (this.comparator(this.heap[index], this.heap[parentIndex]) >= 0)
                break;
            // Use temporary variables to satisfy TypeScript
            const indexVal = this.heap[index];
            const parentVal = this.heap[parentIndex];
            [this.heap[index], this.heap[parentIndex]] = [parentVal, indexVal];
            index = parentIndex;
        }
    }
    siftDown(index) {
        const length = this.heap.length;
        while (true) {
            let smallest = index;
            const leftChild = (index << 1) + 1;
            const rightChild = (index << 1) + 2;
            if (leftChild < length && this.comparator(this.heap[leftChild], this.heap[smallest]) < 0) {
                smallest = leftChild;
            }
            if (rightChild < length && this.comparator(this.heap[rightChild], this.heap[smallest]) < 0) {
                smallest = rightChild;
            }
            if (smallest === index)
                break;
            // Use temporary variables to satisfy TypeScript
            const smallestVal = this.heap[smallest];
            const indexVal = this.heap[index];
            [this.heap[index], this.heap[smallest]] = [smallestVal, indexVal];
            index = smallest;
        }
    }