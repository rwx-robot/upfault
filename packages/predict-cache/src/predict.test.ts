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
