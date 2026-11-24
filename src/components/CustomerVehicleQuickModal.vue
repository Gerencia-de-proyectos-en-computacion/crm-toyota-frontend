<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CustomerItem, DocumentType, VehicleItem } from '@/types/crm'
import { api, extractErrorMessage } from '@/services/api'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  open: boolean
  preselectedCustomer?: {
    id: number
    documentType: DocumentType
    documentNumber: string
    fullName: string
    phone: string
  } | null
}>()

const emit = defineEmits<{
  close: []
  created: [vehicle: VehicleItem]
}>()

const toast = useToastStore()
const busy = ref(false)
const errorText = ref('')

const existingCustomerId = ref<number | null>(null)
const documentType = ref<DocumentType>('DNI')
const documentNumber = ref('')
const fullName = ref('')
const phone = ref('')
const email = ref('')
const dataConsentAccepted = ref(true)

const licensePlate = ref('')
const specialPlate = ref(false)
const model = ref('Yaris')
const manufactureYear = ref(2022)
const trimVersion = ref('1.5 CVT')
const currentMileageKm = ref(40000)
const vin = ref('')

const toyotaModels = ['Yaris', 'Corolla', 'Hilux', 'RAV4', 'Avanza']

watch(
  () => [props.open, props.preselectedCustomer] as const,
  ([isOpen, pre]) => {
    if (!isOpen) return
    errorText.value = ''
    licensePlate.value = ''
    vin.value = ''
    if (pre) {
      existingCustomerId.value = pre.id
      documentType.value = pre.documentType
      documentNumber.value = pre.documentNumber
      fullName.value = pre.fullName
      phone.value = pre.phone
      dataConsentAccepted.value = true
    } else {
      existingCustomerId.value = null
      documentType.value = 'DNI'
      documentNumber.value = ''
      fullName.value = ''
      phone.value = ''
      email.value = ''
      dataConsentAccepted.value = true
    }
  },
  { immediate: true },
)

async function checkExistingCustomerByDoc() {
  const doc = documentNumber.value.trim()
  if (doc.length < 8) {
    if (!props.preselectedCustomer) {
      existingCustomerId.value = null
    }
    return
  }
  try {
    const { data } = await api.get<CustomerItem[]>('/api/v1/customers', { params: { q: doc } })
    const exact = data.find((c) => c.documentNumber === doc)
    if (exact) {
      existingCustomerId.value = exact.id
      documentType.value = exact.documentType
      fullName.value = exact.fullName
      phone.value = exact.phone
      email.value = exact.email ?? ''
      dataConsentAccepted.value = true
    } else if (!props.preselectedCustomer) {
      existingCustomerId.value = null
    }
  } catch {
    // Silencioso durante autocompletado
  }
}

function clearDetectedCustomer() {
  existingCustomerId.value = null
  documentNumber.value = ''
  fullName.value = ''
  phone.value = ''
  email.value = ''
}

async function submitQuickIntake() {
  errorText.value = ''
  busy.value = true
  try {
    let targetCustomerId = existingCustomerId.value

    if (!targetCustomerId) {
      const { data: existingList } = await api.get<CustomerItem[]>('/api/v1/customers', {
        params: { q: documentNumber.value.trim() },
      })
      const matched = existingList.find((c) => c.documentNumber === documentNumber.value.trim())
      if (matched) {
        targetCustomerId = matched.id
      } else {
        const custRes = await api.post<CustomerItem>('/api/v1/customers', {
          documentType: documentType.value,
          documentNumber: documentNumber.value.trim(),
          fullName: fullName.value.trim(),
          phone: phone.value.trim(),
          email: email.value.trim() || null,
          address: null,
          dataConsentAccepted: dataConsentAccepted.value,
        })
        targetCustomerId = custRes.data.id
      }
    }

    const vehRes = await api.post<VehicleItem>('/api/v1/vehicles', {
      customerId: targetCustomerId,
      licensePlate: licensePlate.value.trim().toUpperCase(),
      specialPlate: specialPlate.value,
      vin: vin.value.trim() || null,
      model: model.value,
      manufactureYear: manufactureYear.value,
      trimVersion: trimVersion.value.trim(),
      currentMileageKm: currentMileageKm.value,
      allowMileageOverride: false,
    })

    toast.show(
      existingCustomerId.value
        ? `Nuevo Toyota ${vehRes.data.licensePlate} vinculado a la cuenta existente de ${vehRes.data.customerName}`
        : `Cliente y Toyota ${vehRes.data.licensePlate} registrados en mostrador`,
    )
    emit('created', vehRes.data)
    emit('close')
  } catch (err) {
    errorText.value = extractErrorMessage(err, 'Verifique los datos ingresados.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    v-if="open"
    role="dialog"
    aria-modal="true"
    class="fixed inset-0 z-50 bg-light-on-surface/50 flex items-center justify-center p-gutter-lg"
  >
    <form
      class="w-full max-w-2xl bg-light-surface-container-lowest border border-light-outline-variant rounded shadow-lg overflow-hidden"
      @submit.prevent="submitQuickIntake"
    >
      <header
        class="px-gutter-lg py-gutter-md bg-light-surface-container-low border-b border-light-outline-variant flex items-center justify-between"
      >
        <div>
          <h2 class="font-headline text-headline-md text-light-on-surface">
            {{
              existingCustomerId
                ? 'Agregar Vehículo Toyota a Cliente Existente'
                : 'Alta Rápida de Cliente y Vehículo Toyota'
            }}
          </h2>
          <p class="font-body text-body-sm text-light-on-surface-variant">
            Si el DNI o RUC ya existe en cartera, se vincula el nuevo vehículo sin duplicar al cliente (1:N)
          </p>
        </div>
        <button
          type="button"
          class="w-7 h-7 rounded-xs text-light-on-surface-variant hover:bg-light-surface-container inline-flex items-center justify-center"
          @click="emit('close')"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </header>

      <div class="p-gutter-lg grid grid-cols-1 md:grid-cols-2 gap-gutter-md">
        <div
          v-if="errorText"
          class="md:col-span-2 p-gutter-sm rounded-sm bg-light-error-container text-light-on-error-container font-body text-body-sm"
        >
          {{ errorText }}
        </div>

        <div
          v-if="existingCustomerId"
          class="md:col-span-2 px-gutter-md py-gutter-xs rounded-sm bg-success-container text-on-success-container flex items-center justify-between gap-gutter-sm"
        >
          <div class="flex items-center gap-1.5 font-body text-body-sm">
            <span class="material-symbols-outlined text-[16px]">verified</span>
            <span>
              Cliente existente detectado: <strong>{{ fullName }}</strong> ({{ documentType }}
              {{ documentNumber }}). No se duplicará su ficha; solo se agregará el nuevo vehículo a su flota.
            </span>
          </div>
          <button
            v-if="!preselectedCustomer"
            type="button"
            class="px-2 py-0.5 rounded-xs bg-light-surface-container-lowest text-light-on-surface font-label text-label-sm shrink-0"
            @click="clearDetectedCustomer"
          >
            Cambiar DNI/RUC
          </button>
        </div>

        <!-- Customer Column -->
        <div class="flex flex-col gap-gutter-sm">
          <h3 class="font-title text-title-sm text-light-primary uppercase">1. Titular / Empresa</h3>

          <div class="grid grid-cols-3 gap-gutter-xs">
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Tipo Doc.</span>
              <select
                v-model="documentType"
                :disabled="Boolean(existingCustomerId)"
                class="h-8 px-2 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-sm disabled:opacity-60"
              >
                <option value="DNI">DNI (8)</option>
                <option value="RUC">RUC (11)</option>
              </select>
            </label>
            <label class="col-span-2 flex flex-col gap-1">
              <span class="font-label text-label-sm">N° Documento *</span>
              <input
                v-model="documentNumber"
                :readonly="Boolean(existingCustomerId)"
                required
                placeholder="Escribe DNI/RUC para buscar..."
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-md read-only:bg-light-surface-container-low"
                @blur="checkExistingCustomerByDoc"
                @input="checkExistingCustomerByDoc"
              />
            </label>
          </div>

          <label class="flex flex-col gap-1">
            <span class="font-label text-label-sm">Nombre Completo / Razón Social *</span>
            <input
              v-model="fullName"
              :readonly="Boolean(existingCustomerId)"
              required
              placeholder="Ej. Luis Paredes / Flota SAC"
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-body text-body-md read-only:bg-light-surface-container-low"
            />
          </label>

          <div class="grid grid-cols-2 gap-gutter-xs">
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Celular WhatsApp *</span>
              <input
                v-model="phone"
                :readonly="Boolean(existingCustomerId)"
                required
                placeholder="987654321"
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-md read-only:bg-light-surface-container-low"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Correo (opcional)</span>
              <input
                v-model="email"
                :readonly="Boolean(existingCustomerId)"
                type="email"
                placeholder="cliente@correo.pe"
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-body text-body-sm read-only:bg-light-surface-container-low"
              />
            </label>
          </div>

          <label
            class="mt-1 p-gutter-sm rounded-sm bg-light-surface-container-low border border-light-outline-variant flex items-start gap-2 cursor-pointer"
          >
            <input
              v-model="dataConsentAccepted"
              :disabled="Boolean(existingCustomerId)"
              type="checkbox"
              required
              class="mt-0.5 text-light-primary"
            />
            <span class="font-body text-body-sm text-light-on-surface-variant leading-tight">
              El titular autoriza expresamente el tratamiento de sus datos personales conforme a la
              <strong>Ley N.° 29733</strong> (Protección de Datos Personales — Perú).
            </span>
          </label>
        </div>

        <!-- Vehicle Column -->
        <div class="flex flex-col gap-gutter-sm">
          <h3 class="font-title text-title-sm text-light-primary uppercase">2. Nuevo Vehículo Toyota</h3>

          <div class="grid grid-cols-2 gap-gutter-xs items-end">
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Placa Rodaje *</span>
              <input
                v-model="licensePlate"
                required
                placeholder="ABC-123"
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-md uppercase"
              />
            </label>
            <label class="h-8 flex items-center gap-1.5 font-body text-body-sm text-light-on-surface-variant">
              <input v-model="specialPlate" type="checkbox" />
              <span>Placa especial / trámite</span>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-gutter-xs">
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Modelo Toyota *</span>
              <select
                v-model="model"
                class="h-8 px-2 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-md"
              >
                <option v-for="m in toyotaModels" :key="m" :value="m">{{ m }}</option>
              </select>
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Año Fabricación *</span>
              <input
                v-model.number="manufactureYear"
                type="number"
                min="1995"
                max="2027"
                required
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-md"
              />
            </label>
          </div>

          <div class="grid grid-cols-2 gap-gutter-xs">
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Versión / Motor *</span>
              <input
                v-model="trimVersion"
                required
                placeholder="1.5 CVT / 2.8 4x4"
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-body text-body-sm"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Kilometraje Actual *</span>
              <input
                v-model.number="currentMileageKm"
                type="number"
                min="0"
                required
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-md"
              />
            </label>
          </div>

          <label class="flex flex-col gap-1">
            <span class="font-label text-label-sm">VIN / Chasis (opcional)</span>
            <input
              v-model="vin"
              placeholder="MR2B29F30M..."
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-sm uppercase"
            />
          </label>
        </div>
      </div>

      <footer
        class="px-gutter-lg py-gutter-sm border-t border-light-outline-variant bg-light-surface-container-low flex justify-end gap-gutter-sm"
      >
        <button
          type="button"
          class="h-8 px-gutter-md rounded-sm bg-light-surface-container-lowest border border-light-outline-variant font-label text-label-md"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="busy"
          class="h-8 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-md hover:opacity-90 disabled:opacity-50"
        >
          {{
            busy
              ? 'Guardando...'
              : existingCustomerId
                ? 'Vincular Nuevo Vehículo al Cliente'
                : 'Registrar Cliente y Vehículo'
          }}
        </button>
      </footer>
    </form>
  </div>
</template>
