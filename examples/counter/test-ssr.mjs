// Test SSR package directly from dist
import * as ssr from '../../packages/ssr/dist/index.mjs';

console.log('SSR exports:', Object.keys(ssr));
console.log('has hydrate:', 'hydrate' in ssr);
console.log('has hydrateRoot:', 'hydrateRoot' in ssr);
console.log('has hydrateNodeStream:', 'hydrateNodeStream' in ssr);
console.log('has hydrateWebStream:', 'hydrateWebStream' in ssr);
console.log('has partialHydrate:', 'partialHydrate' in ssr);