import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import PosCounterView from '@/views/PosCounterView.vue'
import QuotesManagementView from '@/views/QuotesManagementView.vue'
import CustomersVehiclesView from '@/views/CustomersVehiclesView.vue'
import InventoryForecastView from '@/views/InventoryForecastView.vue'
import SettingsView from '@/views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    {
      path: '/pos',
      name: 'pos',
      component: PosCounterView,
      meta: { roles: ['ADMIN', 'RECEPCIONISTA'] },
    },
    {
      path: '/cotizaciones',
      name: 'quotes',
      component: QuotesManagementView,
      meta: { roles: ['ADMIN', 'RECEPCIONISTA'] },
    },
    {
      path: '/clientes-vehiculos',
      name: 'customers',
      component: CustomersVehiclesView,
      meta: { roles: ['ADMIN', 'RECEPCIONISTA'] },
    },
    {
      path: '/inventario-ml',
      name: 'forecast',
      component: InventoryForecastView,
      meta: { roles: ['ADMIN', 'ALMACEN', 'RECEPCIONISTA'] },
    },
    {
      path: '/configuracion',
      name: 'settings',
      component: SettingsView,
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: () => {
        const auth = useAuthStore()
        if (!auth.isAuthenticated) return '/login'
        return auth.role === 'ALMACEN' ? '/inventario-ml' : '/pos'
      },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isAuthenticated) {
      return auth.role === 'ALMACEN' ? '/inventario-ml' : '/pos'
    }
    return true
  }
  if (!auth.isAuthenticated) {
    return '/login'
  }
  const allowedRoles = to.meta.roles as string[] | undefined
  if (allowedRoles && auth.role && !allowedRoles.includes(auth.role)) {
    return auth.role === 'ALMACEN' ? '/inventario-ml' : '/pos'
  }
  return true
})

export default router
