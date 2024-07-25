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