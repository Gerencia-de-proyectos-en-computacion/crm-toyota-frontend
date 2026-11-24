import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthSession, Role } from '@/types/crm'

const STORAGE_KEY = 'crm_toyota_auth_session_v1'

export const useAuthStore = defineStore('auth', () => {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  const session = ref<AuthSession | null>(raw ? (JSON.parse(raw) as AuthSession) : null)

  const isAuthenticated = computed(() => Boolean(session.value?.accessToken))
  const role = computed<Role | null>(() => session.value?.role ?? null)
  const maxDiscountPercent = computed(() => session.value?.maxDiscountPercent ?? 0)

  function setSession(next: AuthSession) {
    session.value = next
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }

  function logout() {
    session.value = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function shouldSilentRefresh(): boolean {
    if (!session.value?.expiresAt) return false
    const remainingMs = new Date(session.value.expiresAt).getTime() - Date.now()
    const twoHoursMs = 2 * 60 * 60 * 1000
    return remainingMs > 0 && remainingMs < twoHoursMs
  }

  function canAccessPos(): boolean {
    return role.value === 'ADMIN' || role.value === 'RECEPCIONISTA'
  }

  function canAccessForecast(): boolean {
    return role.value === 'ADMIN' || role.value === 'ALMACEN'
  }

  return {
    session,
    isAuthenticated,
    role,
    maxDiscountPercent,
    setSession,
    logout,
    shouldSilentRefresh,
    canAccessPos,
    canAccessForecast,
  }
})
