/**
 * AeroDiff Core - 双端扩散 Diff 算法
 * 
 * 核心思想：
 * 1. 双端预处理：从头尾跳过相同节点 O(k)
 * 2. 建立索引：Key Map + Type Map O(n)