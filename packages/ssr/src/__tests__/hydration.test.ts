import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  hydrate, 
  hydrateRoot, 
  partialHydrate, 
  lazyHydrate, 
  isHydrated, 
  markHydrated, 
  getHydrationState 
} from '../hydration';

// Mock IntersectionObserver for jsdom
const mockIntersectionObserver = vi.fn().mockImplementation((callback, options) => {
  const observe = vi.fn();
  const unobserve = vi.fn();
  return { observe, unobserve, disconnect: vi.fn(), takeRecords: vi.fn(), callback, options };
});

vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

describe('SSR Hydration', () => {
  let container: HTMLElement;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    vi.clearAllMocks();
  });

  describe('isHydrated / markHydrated', () => {
    it('should return false for unhydrated element', () => {
      const el = document.createElement('div');
      expect(isHydrated(el)).toBe(false);
    });

    it('should return true after markHydrated', () => {
      const el = document.createElement('div');
      markHydrated(el);
      expect(isHydrated(el)).toBe(true);
    });
  });

  describe('getHydrationState', () => {
    it('should return counts', () => {
      const state = getHydrationState();
      expect(state).toHaveProperty('hydratedCount');
      expect(state).toHaveProperty('pendingCount');
      expect(typeof state.hydratedCount).toBe('number');
      expect(typeof state.pendingCount).toBe('number');
    });
  });
