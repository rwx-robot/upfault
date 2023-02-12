import { h, ref, onMounted } from '@upfault/runtime';

export function Counter() {
  const count = ref(0);
  
  onMounted(() => {
    console.log('Counter mounted!');
  });
  
  return () => h('div', { class: 'counter' }, [
    h('p', null, `Count: ${count.value}`),
    h('button', { 