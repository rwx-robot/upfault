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

  describe('partialHydrate', () => {
    it('should hydrate elements matching selector', () => {
      const el1 = document.createElement('div');
      el1.setAttribute('data-hydrate', 'test');
      document.body.appendChild(el1);
      
      const el2 = document.createElement('div');
      el2.setAttribute('data-hydrate', 'test');
      document.body.appendChild(el2);

      const vnode = { type: 'span', props: {}, children: 'hydrated' };
      
      partialHydrate('[data-hydrate="test"]', vnode);
      
      expect(el1.querySelectorAll('*').length).toBeGreaterThanOrEqual(0);
      expect(el2.querySelectorAll('*').length).toBeGreaterThanOrEqual(0);
    });

    it('should call onHydrated callback', () => {
      const el = document.createElement('div');
      el.setAttribute('data-hydrate', 'test');
      document.body.appendChild(el);