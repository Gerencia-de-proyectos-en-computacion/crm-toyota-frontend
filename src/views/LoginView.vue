<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { AuthSession } from '@/types/crm'
import { api, extractErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useWorkshopConfigStore } from '@/stores/workshopConfig'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const auth = useAuthStore()
const workshopConfig = useWorkshopConfigStore()
const toast = useToastStore()

const username = ref('recepcion')
const password = ref('Toyota2026!')
const loading = ref(false)
const errorMsg = ref('')

function fillDemo(user: string) {
  username.value = user
  password.value = 'Toyota2026!'
  errorMsg.value = ''
}

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    const { data } = await api.post<AuthSession>('/api/v1/auth/login', {
      username: username.value.trim(),
      password: password.value,
    })
    auth.setSession(data)
    toast.show(`Bienvenido, ${data.fullName} (${data.role})`)
    router.push(data.role === 'ALMACEN' ? '/inventario-ml' : '/pos')
  } catch (err) {
    errorMsg.value = extractErrorMessage(err, 'No se pudo iniciar sesión. Verifique el servidor.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen w-full bg-light-background flex items-center justify-center p-gutter-lg">
    <div
      class="w-full max-w-md bg-light-surface-container-lowest border border-light-outline-variant rounded overflow-hidden"
    >
      <header class="p-gutter-xl border-b border-light-outline-variant bg-light-surface-container-low">
        <div class="flex items-center gap-gutter-sm mb-gutter-xs">
          <span
            class="w-9 h-9 rounded-sm bg-light-primary text-light-on-primary flex items-center justify-center"
          >
            <span class="material-symbols-outlined text-[20px]">directions_car</span>
          </span>
          <div>
            <h1 class="font-headline text-headline-lg text-light-on-surface">
              {{ workshopConfig.settings.businessName }}
            </h1>
            <p class="font-body text-body-sm text-light-on-surface-variant">
              {{ workshopConfig.settings.slogan }}
            </p>
          </div>
        </div>
      </header>

      <form class="p-gutter-xl flex flex-col gap-gutter-md" @submit.prevent="handleLogin">
        <div
          v-if="errorMsg"
          class="p-gutter-sm rounded-sm bg-light-error-container text-light-on-error-container font-body text-body-sm"
        >
          {{ errorMsg }}
        </div>

        <label class="flex flex-col gap-1">
          <span class="font-label text-label-md text-light-on-surface">Usuario de Turno</span>
          <input
            v-model="username"
            required
            autocomplete="username"
            class="h-9 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md focus:border-light-primary focus:ring-1 focus:ring-light-primary"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-label text-label-md text-light-on-surface">Contraseña</span>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="h-9 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md focus:border-light-primary focus:ring-1 focus:ring-light-primary"
          />
        </label>

        <button
          type="submit"
          :disabled="loading"
          class="h-10 rounded-sm bg-light-primary text-light-on-primary font-label text-label-lg hover:opacity-90 disabled:opacity-50"
        >
          {{ loading ? 'Autenticando turno (14h)...' : 'Ingresar al Mostrador' }}
        </button>

        <div class="pt-gutter-sm border-t border-light-outline-variant flex flex-col gap-gutter-xs">
          <span class="font-label text-label-sm text-light-on-surface-variant uppercase">
            Acceso Rápido Piloto / Entrevistas (1 clic):
          </span>
          <div class="grid grid-cols-3 gap-gutter-xs">
            <button
              type="button"
              class="h-7 px-2 rounded-xs border border-light-outline-variant bg-light-surface-container-low hover:bg-light-surface-container font-label text-label-sm"
              @click="fillDemo('recepcion')"
            >
              Recepcionista
            </button>
            <button
              type="button"
              class="h-7 px-2 rounded-xs border border-light-outline-variant bg-light-surface-container-low hover:bg-light-surface-container font-label text-label-sm"
              @click="fillDemo('almacen')"
            >
              Almacén
            </button>
            <button
              type="button"
              class="h-7 px-2 rounded-xs border border-light-outline-variant bg-light-surface-container-low hover:bg-light-surface-container font-label text-label-sm"
              @click="fillDemo('admin')"
            >
              Admin
            </button>
          </div>
        </div>
      </form>
    </div>
  </main>
</template>
