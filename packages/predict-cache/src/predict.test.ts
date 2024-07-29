import { describe, it, expect, vi } from 'vitest';
import {
  createFingerprint,
  computeDecayScore,
  updateFingerprint,
  shouldSkip,
  recordFalseSkip,
  recordCorrectSkip,
  createPredictionStats,
  DEFAULT_ADAPTIVE_CONFIG,
  createAdaptiveThreshold,
  defaultFastHash,
} from './predict';

describe('Predict Cache - Fingerprint', () => {
  it('should create initial fingerprint', () => {
    const fp = createFingerprint();
    expect(fp.updateCount).toBe(0);
    expect(fp.lastUpdateTime).toBe(0);
    expect(fp.decayScore).toBe(0);
    expect(fp.hashHistory).toHaveLength(8);
    expect(fp.hashHistory.every(h => h === 0)).toBe(true);
    expect(fp.skipConfidence).toBe(0);
  });

  it('should compute decay score', () => {
    const fp = createFingerprint();
    fp.updateCount = 5;
    fp.lastUpdateTime = 1000;
    
    const score = computeDecayScore(fp, 2000);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(5);
  });

  it('should update fingerprint', () => {
    const fp = createFingerprint();
    const now = performance.now();
    
    updateFingerprint(fp, 0x1234, now);
    
    expect(fp.updateCount).toBe(1);
    expect(fp.lastUpdateTime).toBe(now);
    expect(fp.lastContentHash).toBe(0x1234);
    expect(fp.consecutiveSkips).toBe(0);
    expect(fp.consecutiveHits).toBe(0);
  });

  it('should skip unchanged content', () => {
    const fp = createFingerprint();
    fp.updateCount = 1;
    const testData = { data: 'same' };
    const contentHash = defaultFastHash(testData);
    
    fp.updateCount = 1;
    fp.lastContentHash = contentHash;
    fp.hashHistory = [contentHash, 0, 0, 0, 0, 0, 0, 0];
    
    const result = shouldSkip(fp, testData, defaultFastHash);
    expect(result).toBe(true);
  });

  it('should not skip hot nodes', () => {
    const fp = createFingerprint();
    fp.updateCount = 100;
    fp.lastUpdateTime = performance.now();
    
    const result = shouldSkip(fp, { data: 'any' }, defaultFastHash);
    expect(result).toBe(false);
  });
});

describe('Predict Cache - Statistics', () => {
  it('should create prediction stats', () => {
    const stats = createPredictionStats({ skipTotal: 10, skipCorrect: 9, skipFalse: 1, passTotal: 5 });
    expect(stats.accuracy()).toBe(0.9);
    expect(stats.recall()).toBe(5 / 6); // 5 / (1 + 5)
    expect(stats.f1()).toBeCloseTo(2 * 0.9 * (5/6) / (0.9 + 5/6));
    expect(stats.skipRate()).toBe(10 / 15);
  });
});

describe('Predict Cache - Adaptive Threshold', () => {
  it('should create adaptive threshold', () => {
    const threshold = createAdaptiveThreshold({ targetAccuracy: 0.9, adjustmentStep: 0.1 });
    expect(threshold.getThreshold()).toBe(0.7);
  });

  it('should adjust threshold based on accuracy', () => {
