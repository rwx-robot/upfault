import { h, ref, onMounted } from '@upfault/runtime';

export function Counter() {
  const count = ref(0);
  
  onMounted(() => {