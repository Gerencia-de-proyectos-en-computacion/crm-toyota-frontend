import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const visible = ref(false)
  const message = ref('')
  const tone = ref<'success' | 'error' | 'info'>('success')
  let timer: ReturnType<typeof setTimeout> | null = null

  function show(msg: string, nextTone: 'success' | 'error' | 'info' = 'success') {
    message.value = msg
    tone.value = nextTone
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, 3200)
  }

  return { visible, message, tone, show }
})
