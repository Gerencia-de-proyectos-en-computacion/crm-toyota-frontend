<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkshopConfigStore } from '@/stores/workshopConfig'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const auth = useAuthStore()
const workshopConfig = useWorkshopConfigStore()
const toast = useToastStore()

const showShell = computed(() => auth.isAuthenticated && !route.meta.public)

onMounted(() => {
  workshopConfig.fetchSettings()
})
</script>

<template>
  <AppShell v-if="showShell">
    <RouterView />
  </AppShell>
  <RouterView v-else />

  <div
    v-if="toast.visible"
    role="status"
    aria-live="polite"
    class="no-print fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-gutter-lg py-gutter-sm rounded-sm bg-light-inverse-surface text-light-inverse-on-surface font-label text-label-md flex items-center gap-gutter-sm shadow-lg"
  >
    <span
      class="material-symbols-outlined text-[16px]"
      :class="toast.tone === 'error' ? 'text-light-inverse-primary' : 'text-success'"
    >
      {{ toast.tone === 'error' ? 'error' : 'check_circle' }}
    </span>
    <span>{{ toast.message }}</span>
  </div>
</template>
