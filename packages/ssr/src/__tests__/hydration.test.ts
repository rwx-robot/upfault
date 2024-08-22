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