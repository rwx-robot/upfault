// Test SSR package directly from dist
import * as ssr from '../../packages/ssr/dist/index.mjs';

console.log('SSR exports:', Object.keys(ssr));