export function isHydrated(element: Element): boolean {
  return (element as any).__upfault_hydrated === true;