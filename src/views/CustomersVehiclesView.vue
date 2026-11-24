<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DocumentType, VehicleItem } from '@/types/crm'
import { api, extractErrorMessage } from '@/services/api'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useToastStore } from '@/stores/toast'
import CustomerVehicleQuickModal from '@/components/CustomerVehicleQuickModal.vue'

const router = useRouter()
const draft = useQuoteDraftStore()
const toast = useToastStore()

const vehicles = ref<VehicleItem[]>([])
const query = ref('')
const showNewModal = ref(false)
const preselectedOwner = ref<{
  id: number
  documentType: DocumentType
  documentNumber: string
  fullName: string
  phone: string
} | null>(null)

async function fetchVehicles() {
  try {
    const { data } = await api.get<VehicleItem[]>('/api/v1/vehicles', {
      params: query.value.trim() ? { q: query.value.trim() } : {},
    })
    vehicles.value = data
  } catch (err) {
    toast.show(extractErrorMessage(err, 'Error consultando cartera vehicular'), 'error')
  }
}

function openFreshModal() {
  preselectedOwner.value = null
  showNewModal.value = true
}

function openAddSecondVehicle(v: VehicleItem) {
  preselectedOwner.value = {
    id: v.customerId,
    documentType: v.customerDocumentType,
    documentNumber: v.customerDocumentNumber,
    fullName: v.customerName,
    phone: v.customerPhone,
  }
  showNewModal.value = true
}

function sendToPos(v: VehicleItem) {
  draft.setVehicle(v)
  router.push('/pos')
}

async function onCreated() {
  await fetchVehicles()
}

onMounted(() => {
  fetchVehicles()
})
</script>

<template>
  <main class="p-gutter-md flex flex-col gap-gutter-md">
    <div
      class="bg-light-surface-container-lowest border border-light-outline-variant rounded px-gutter-lg py-gutter-sm flex items-center justify-between gap-gutter-md flex-wrap"
    >
      <div>
        <h2 class="font-headline text-headline-lg text-light-on-surface">
          Cartera de Clientes (Ley N.° 29733) y Flota Toyota (Relación 1:N)
        </h2>
        <p class="font-body text-body-sm text-light-on-surface-variant">
          Un mismo cliente o flota corporativa puede tener múltiples vehículos Toyota vinculados sin duplicar su DNI/RUC
        </p>
      </div>

      <div class="flex items-center gap-gutter-sm">
        <input
          v-model="query"
          type="search"
          placeholder="Buscar placa, DNI/RUC o titular..."
          class="h-8 w-64 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-low font-body text-body-sm"
          @input="fetchVehicles"
        />
        <button
          type="button"
          class="inline-flex items-center gap-1 h-9 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-lg hover:opacity-90"
          @click="openFreshModal"
        >
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Nuevo Cliente / Vehículo</span>
        </button>
      </div>
    </div>

    <section
      class="bg-light-surface-container-lowest border border-light-outline-variant rounded overflow-hidden"
    >
      <div class="pos-scroll overflow-y-auto max-h-[540px]">
        <table class="w-full border-collapse text-left">
          <thead class="sticky top-0 z-10 bg-light-surface-container-low border-b border-light-outline-variant">
            <tr>
              <th class="px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Placa
              </th>
              <th class="px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Modelo Toyota & Año
              </th>
              <th class="px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Kilometraje
              </th>
              <th class="px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Titular / Empresa
              </th>
              <th class="px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Consentimiento
              </th>
              <th class="px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Kit Sugerido
              </th>
              <th
                class="px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-light-outline-variant">
            <tr v-for="v in vehicles" :key="v.id" class="hover:bg-light-surface-container-low">
              <td class="px-gutter-sm py-2.5">
                <span class="px-2 py-0.5 rounded-xs bg-light-on-surface text-light-surface-bright font-mono text-mono-md">
                  {{ v.licensePlate }}
                </span>
              </td>
              <td class="px-gutter-sm py-2.5">
                <div class="font-title text-title-sm">Toyota {{ v.model }} {{ v.trimVersion }}</div>
                <div class="font-mono text-mono-sm text-light-on-surface-variant">Año {{ v.manufactureYear }}</div>
              </td>
              <td class="px-gutter-sm py-2.5 font-mono text-mono-md tabular-nums">
                {{ v.currentMileageKm.toLocaleString('es-PE') }} km
              </td>
              <td class="px-gutter-sm py-2.5">
                <div class="font-title text-title-sm">{{ v.customerName }}</div>
                <div class="font-mono text-mono-sm text-light-on-surface-variant">
                  {{ v.customerDocumentType }} {{ v.customerDocumentNumber }} • {{ v.customerPhone }}
                </div>
              </td>
              <td class="px-gutter-sm py-2.5">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-on-success-container font-label text-label-sm"
                >
                  <span class="material-symbols-outlined text-[13px]">verified_user</span>
                  Ley 29733 OK
                </span>
              </td>
              <td class="px-gutter-sm py-2.5 font-body text-body-sm text-light-on-surface-variant">
                {{ v.suggestedPreventiveKit ? v.suggestedPreventiveKit.name : 'Estándar' }}
              </td>
              <td class="px-gutter-sm py-2.5 text-right">
                <div class="inline-flex items-center gap-1">
                  <button
                    type="button"
                    title="Agregar otro vehículo Toyota a este mismo cliente"
                    class="h-7 px-2 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest hover:bg-light-surface-container font-label text-label-sm"
                    @click="openAddSecondVehicle(v)"
                  >
                    + Otro Auto
                  </button>
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-sm bg-light-primary text-light-on-primary font-label text-label-sm hover:opacity-90"
                    @click="sendToPos(v)"
                  >
                    Cotizar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <CustomerVehicleQuickModal
      :open="showNewModal"
      :preselected-customer="preselectedOwner"
      @close="showNewModal = false"
      @created="onCreated"
    />
  </main>
</template>
