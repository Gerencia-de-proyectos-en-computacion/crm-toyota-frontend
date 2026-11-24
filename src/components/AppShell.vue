<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkshopConfigStore } from '@/stores/workshopConfig'
import { useQuoteDraftStore } from '@/stores/quoteDraft'

const auth = useAuthStore()
const workshopConfig = useWorkshopConfigStore()
const draft = useQuoteDraftStore()
const route = useRoute()
const router = useRouter()

const expanded = ref(false)

interface NavItem {
  to: string
  icon: string
  label: string
  roles: string[]
}

const allNavItems: NavItem[] = [
  { to: '/pos', icon: 'point_of_sale', label: 'Cotizador POS', roles: ['ADMIN', 'RECEPCIONISTA'] },
  { to: '/cotizaciones', icon: 'receipt_long', label: 'Cotizaciones', roles: ['ADMIN', 'RECEPCIONISTA'] },
  { to: '/clientes-vehiculos', icon: 'garage', label: 'Clientes y Autos', roles: ['ADMIN', 'RECEPCIONISTA'] },
  { to: '/inventario-ml', icon: 'inventory_2', label: 'Inventario & ML', roles: ['ADMIN', 'ALMACEN', 'RECEPCIONISTA'] },
  { to: '/configuracion', icon: 'settings', label: 'Marca Blanca', roles: ['ADMIN'] },
]

const visibleNavItems = computed(() =>
  allNavItems.filter((item) => auth.role && item.roles.includes(auth.role)),
)

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen w-full flex bg-light-background overflow-x-hidden">
    <!-- Left Collapsible Compact Sidebar (64px default — Stitch Shell Parity) -->
    <aside
      aria-label="Navegación principal"
      class="no-print shrink-0 min-h-screen bg-light-surface-container-lowest border-r border-light-outline-variant flex flex-col justify-between py-gutter-sm transition-all duration-150"
      :class="expanded ? 'w-48' : 'w-16'"
    >
      <div class="flex flex-col items-center gap-gutter-sm px-gutter-xs">
        <div class="w-full flex items-center justify-center h-9 mb-gutter-xs">
          <button
            type="button"
            title="Alternar menú lateral"
            class="w-10 h-9 rounded-sm bg-light-primary text-light-on-primary flex items-center justify-center hover:opacity-90"
            @click="expanded = !expanded"
          >
            <span class="material-symbols-outlined text-[20px]">directions_car</span>
          </button>
        </div>

        <nav class="w-full flex flex-col gap-gutter-xs" aria-label="Módulos CRM">
          <RouterLink
            v-for="item in visibleNavItems"
            :key="item.to"
            :to="item.to"
            :title="item.label"
            class="flex items-center gap-gutter-sm h-10 px-gutter-sm rounded-sm font-label text-label-md transition-colors"
            :class="[
              expanded ? 'justify-start' : 'justify-center',
              route.path === item.to
                ? 'bg-light-primary-container text-light-on-primary-container'
                : 'text-light-on-surface-variant hover:bg-light-surface-container-low hover:text-light-on-surface',
            ]"
          >
            <span class="material-symbols-outlined text-[20px] shrink-0">{{ item.icon }}</span>
            <span v-if="expanded" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>

      <div class="flex flex-col items-center gap-gutter-xs px-gutter-xs">
        <button
          type="button"
          title="Cerrar sesión"
          class="w-full flex items-center gap-gutter-sm h-9 px-gutter-sm rounded-sm text-light-on-surface-variant hover:bg-light-error-container hover:text-light-on-error-container font-label text-label-md"
          :class="expanded ? 'justify-start' : 'justify-center'"
          @click="handleLogout"
        >
          <span class="material-symbols-outlined text-[18px] shrink-0">logout</span>
          <span v-if="expanded" class="truncate">Salir</span>
        </button>

        <button
          type="button"
          title="Expandir / contraer barra"
          class="w-full flex items-center justify-center h-8 rounded-sm text-light-on-surface-variant hover:bg-light-surface-container-low"
          @click="expanded = !expanded"
        >
          <span class="material-symbols-outlined text-[18px]">
            {{ expanded ? 'chevron_left' : 'chevron_right' }}
          </span>
        </button>
      </div>
    </aside>

    <!-- Main Content Shell -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Top Bar (48px — Stitch Shell Parity) -->
      <header
        class="no-print h-12 shrink-0 bg-light-surface-container-lowest border-b border-light-outline-variant px-gutter-lg flex items-center justify-between gap-gutter-md"
      >
        <div class="flex items-center gap-gutter-md min-w-0">
          <div class="flex items-center gap-gutter-sm min-w-0">
            <span class="w-2 h-5 rounded-xs bg-light-primary shrink-0"></span>
            <h1 class="font-headline text-headline-md text-light-on-surface truncate">
              {{ workshopConfig.settings.businessName }}
            </h1>
          </div>

          <span
            class="inline-flex items-center px-2 py-0.5 rounded-xs bg-light-secondary-container text-light-on-secondary-container font-label text-label-sm uppercase tracking-wider shrink-0"
          >
            {{ auth.session?.role }}
          </span>

          <div
            class="hidden md:flex items-center gap-1.5 pl-gutter-sm border-l border-light-outline-variant text-light-on-surface-variant"
          >
            <span class="w-2 h-2 rounded-full bg-success shrink-0"></span>
            <span class="font-body text-body-sm">
              Sesión activa: {{ auth.session?.fullName }} • {{ auth.session?.stationLabel }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-gutter-sm shrink-0">
          <span
            v-if="route.path === '/pos'"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-container text-on-success-container font-label text-label-sm"
          >
            <span class="material-symbols-outlined text-[14px]">cloud_done</span>
            <span>{{ draft.lastAutosavedLabel }}</span>
          </span>
        </div>
      </header>

      <div class="flex-1 min-w-0">
        <slot />
      </div>
    </div>
  </div>
</template>
