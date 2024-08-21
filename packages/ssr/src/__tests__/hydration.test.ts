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