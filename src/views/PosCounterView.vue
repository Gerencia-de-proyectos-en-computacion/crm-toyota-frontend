<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import type {
  LaborRateItem,
  PartItem,
  QuoteResponse,
  StockConflictDetail,
  VehicleItem,
} from '@/types/crm'
import { api, extractErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useWorkshopConfigStore } from '@/stores/workshopConfig'
import { useToastStore } from '@/stores/toast'
import CustomerVehicleQuickModal from '@/components/CustomerVehicleQuickModal.vue'
import StockConflictModal from '@/components/StockConflictModal.vue'

const auth = useAuthStore()
const draft = useQuoteDraftStore()
const workshopConfig = useWorkshopConfigStore()
const toast = useToastStore()

const vehicles = ref<VehicleItem[]>([])
const plateQuery = ref('')
const showNewCustomerModal = ref(false)

const activeTab = ref<'PARTS' | 'LABOR'>('PARTS')
const parts = ref<PartItem[]>([])
const laborRates = ref<LaborRateItem[]>([])
const catalogQuery = ref('')
const activeCategory = ref('Todos')
const categories = ['Todos', 'Filtros', 'Frenos', 'Aceites', 'Encendido', 'Embrague']

const saving = ref(false)
const conflictModalOpen = ref(false)
const conflictQuoteId = ref<number | null>(null)
const conflictQuoteNumber = ref('')
const conflicts = ref<StockConflictDetail[]>([])

const filteredVehicles = computed(() => {
  const q = plateQuery.value.trim().toLowerCase()
  if (!q) return vehicles.value.slice(0, 6)
  return vehicles.value.filter(
    (v) =>
      v.licensePlate.toLowerCase().includes(q) ||
      v.customerDocumentNumber.toLowerCase().includes(q) ||
      v.customerName.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q),
  )
})

const filteredParts = computed(() => {
  const q = catalogQuery.value.trim().toLowerCase()
  return parts.value.filter((p) => {
    const catOk = activeCategory.value === 'Todos' || p.category === activeCategory.value
    const textOk =
      !q ||
      p.sku.toLowerCase().includes(q) ||
      p.oemReferenceCode.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    return catOk && textOk
  })
})

async function loadInitialPosData() {
  try {
    const [vehRes, laborRes] = await Promise.all([
      api.get<VehicleItem[]>('/api/v1/vehicles'),
      api.get<LaborRateItem[]>('/api/v1/labor-rates'),
    ])
    vehicles.value = vehRes.data
    laborRates.value = laborRes.data

    if (!draft.selectedVehicle && vehRes.data.length > 0) {
      const defaultVehicle = vehRes.data[0]
      if (defaultVehicle) {
        draft.setVehicle(defaultVehicle)
      }
    }
    await fetchCompatibleParts()
  } catch (err) {
    toast.show(extractErrorMessage(err, 'Error cargando catálogo en mostrador'), 'error')
  }
}

async function fetchCompatibleParts() {
  const params: Record<string, string | number> = {}
  if (draft.selectedVehicle?.id) {
    params.vehicleId = draft.selectedVehicle.id
  }
  const { data } = await api.get<PartItem[]>('/api/v1/parts', { params })
  parts.value = data
}

async function selectVehicle(v: VehicleItem) {
  draft.setVehicle(v)
  plateQuery.value = ''
  await fetchCompatibleParts()
}

async function onVehicleCreated(v: VehicleItem) {
  vehicles.value.unshift(v)
  await selectVehicle(v)
}

function showEquivalentsInTable(oemRef: string) {
  activeCategory.value = 'Todos'
  catalogQuery.value = oemRef
  toast.show(`Mostrando equivalentes compatibles OEM ${oemRef}`, 'info')
}

function applySuggestedKit() {
  const kit = draft.selectedVehicle?.suggestedPreventiveKit
  if (!kit) return
  draft.loadPreventiveKit(kit)
  toast.show(`${kit.name} cargado en la proforma`)
}

function handleDiscountInput(ev: Event) {
  const target = ev.target as HTMLInputElement
  draft.setCappedDiscount(Number(target.value), auth.maxDiscountPercent)
}

function buildUpsertPayload() {
  if (!draft.selectedVehicle) {
    throw new Error('Seleccione primero un cliente y vehículo Toyota.')
  }
  if (draft.items.length === 0) {
    throw new Error('Agregue al menos un repuesto o servicio de mano de obra.')
  }
  return {
    customerId: draft.selectedVehicle.customerId,
    vehicleId: draft.selectedVehicle.id,
    mileageAtQuote: draft.mileageAtQuote || draft.selectedVehicle.currentMileageKm,
    discountPercent: draft.discountPercent,
    notes: draft.notes || null,
    items: draft.items.map((i) => ({
      itemType: i.itemType,
      partId: i.partId,
      laborRateId: i.laborRateId,
      quantity: i.quantity,
    })),
  }
}

async function saveQuoteAsPending(): Promise<QuoteResponse | null> {
  try {
    const payload = buildUpsertPayload()
    saving.value = true
    const res = draft.editingQuoteId
      ? await api.put<QuoteResponse>(`/api/v1/quotes/${draft.editingQuoteId}`, payload)
      : await api.post<QuoteResponse>('/api/v1/quotes', payload)

    draft.editingQuoteId = res.data.id
    draft.editingQuoteNumber = res.data.quoteNumber
    draft.persistNow()
    toast.show(`Proforma ${res.data.quoteNumber} guardada como PENDIENTE`)
    return res.data
  } catch (err) {
    const msg = err instanceof Error && !(axios.isAxiosError(err)) ? err.message : extractErrorMessage(err)
    toast.show(msg, 'error')
    return null
  } finally {
    saving.value = false
  }
}

async function saveAndApproveSale() {
  const saved = await saveQuoteAsPending()
  if (!saved) return
  saving.value = true
  try {
    const approved = await api.post<QuoteResponse>(`/api/v1/quotes/${saved.id}/approve`)
    toast.show(`Venta ${approved.data.quoteNumber} APROBADA • Stock descontado atómicamente`)
    draft.clearDraft()
    await fetchCompatibleParts()
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      const body = err.response.data as { quoteNumber?: string; conflicts?: StockConflictDetail[] }
      if (body.conflicts && body.conflicts.length > 0) {
        conflictQuoteId.value = saved.id
        conflictQuoteNumber.value = body.quoteNumber || saved.quoteNumber
        conflicts.value = body.conflicts
        conflictModalOpen.value = true
        return
      }
    }
    toast.show(extractErrorMessage(err, 'No se pudo aprobar la venta'), 'error')
  } finally {
    saving.value = false
  }
}

async function handleSubstituteAndApprove(missingPartId: number, replacementPartId: number) {
  if (!conflictQuoteId.value) return
  saving.value = true
  try {
    const { data } = await api.post<QuoteResponse>(
      `/api/v1/quotes/${conflictQuoteId.value}/substitute-part`,
      {
        missingPartId,
        replacementPartId,
        autoApproveAfterSubstitute: true,
      },
    )
    conflictModalOpen.value = false
    draft.clearDraft()
    await fetchCompatibleParts()
    toast.show(`Equivalente sustituido y proforma ${data.quoteNumber} APROBADA`)
  } catch (err) {
    toast.show(extractErrorMessage(err, 'No se pudo completar la sustitución'), 'error')
  } finally {
    saving.value = false
  }
}

async function downloadPdfOrPrintFallback() {
  const saved = await saveQuoteAsPending()
  if (!saved) return
  try {
    const res = await api.get<Blob>(`/api/v1/quotes/${saved.id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${saved.quoteNumber}.pdf`
    link.click()
    URL.revokeObjectURL(url)
    toast.show(`PDF ${saved.quoteNumber} generado (< 3s)`)
  } catch {
    toast.show('Activando impresión directa de respaldo (@media print)...', 'info')
    window.print()
  }
}

async function sendViaWhatsApp() {
  const saved = await saveQuoteAsPending()
  if (!saved) return
  window.open(saved.whatsappUrl, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  loadInitialPosData()
})
</script>

<template>
  <!-- Main 2-Column Split View (62% Left / 38% Right — 1366x768 Zero Horizontal Scroll) -->
  <main
    class="p-gutter-md grid grid-cols-1 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] gap-gutter-md items-start"
  >
    <!-- LEFT COLUMN (62%): Step 1 + Step 2 -->
    <div class="no-print min-w-0 flex flex-col gap-gutter-md">
      <!-- STEP 1: Customer & Toyota Vehicle -->
      <section
        class="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-md flex flex-col gap-gutter-sm"
      >
        <div class="flex items-center justify-between gap-gutter-sm flex-wrap">
          <div class="flex items-center gap-gutter-sm">
            <span
              class="inline-flex items-center justify-center w-5 h-5 rounded-xs bg-light-primary text-light-on-primary font-label text-label-sm"
            >
              1
            </span>
            <h2 class="font-title text-title-sm text-light-on-surface">Cliente y Vehículo Toyota</h2>
          </div>

          <div class="flex items-center gap-gutter-sm flex-1 max-w-xl justify-end relative">
            <div class="relative flex-1 max-w-sm">
              <span
                class="material-symbols-outlined text-[16px] text-light-on-surface-variant absolute left-2.5 top-2 pointer-events-none"
              >
                search
              </span>
              <input
                v-model="plateQuery"
                type="search"
                placeholder="Buscar Placa (ABC-123) o DNI/RUC..."
                class="w-full h-8 pl-8 pr-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md focus:border-light-primary focus:ring-1 focus:ring-light-primary"
              />
              <!-- Instant Dropdown Results -->
              <div
                v-if="plateQuery.trim().length > 0"
                class="absolute left-0 right-0 top-9 z-30 bg-light-surface-container-lowest border border-light-outline-variant rounded-sm shadow-lg max-h-48 overflow-y-auto"
              >
                <button
                  v-for="v in filteredVehicles"
                  :key="v.id"
                  type="button"
                  class="w-full px-3 py-1.5 text-left hover:bg-light-surface-container-low flex items-center justify-between border-b border-light-outline-variant last:border-b-0"
                  @click="selectVehicle(v)"
                >
                  <span class="font-mono text-mono-md font-semibold">{{ v.licensePlate }}</span>
                  <span class="font-body text-body-sm text-light-on-surface-variant truncate ml-2">
                    Toyota {{ v.model }} {{ v.manufactureYear }} • {{ v.customerName }}
                  </span>
                </button>
                <div
                  v-if="filteredVehicles.length === 0"
                  class="px-3 py-2 font-body text-body-sm text-light-on-surface-variant"
                >
                  Sin coincidencias. Use "+ Nuevo Cliente/Auto".
                </div>
              </div>
            </div>

            <button
              type="button"
              class="inline-flex items-center gap-1 h-8 px-gutter-md rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface font-label text-label-md hover:bg-light-surface-container-low shrink-0"
              @click="showNewCustomerModal = true"
            >
              <span class="material-symbols-outlined text-[16px]">person_add</span>
              <span>+ Nuevo Cliente/Auto</span>
            </button>
          </div>
        </div>

        <!-- Selected Vehicle Summary Strip -->
        <div
          v-if="draft.selectedVehicle"
          class="flex items-center justify-between gap-gutter-sm px-gutter-md py-gutter-xs rounded-sm bg-light-surface-container-low border border-light-outline-variant flex-wrap"
        >
          <div class="flex items-center gap-gutter-sm min-w-0">
            <span
              class="px-2 py-0.5 rounded-xs bg-light-on-surface text-light-surface-bright font-mono text-mono-md tracking-wide shrink-0"
            >
              {{ draft.selectedVehicle.licensePlate }}
            </span>
            <span class="font-title text-title-sm text-light-on-surface truncate">
              Toyota {{ draft.selectedVehicle.model }} {{ draft.selectedVehicle.trimVersion }} •
              {{ draft.selectedVehicle.manufactureYear }}
            </span>
            <label class="inline-flex items-center gap-1 font-mono text-mono-sm text-light-on-surface-variant">
              <span>• Km:</span>
              <input
                v-model.number="draft.mileageAtQuote"
                type="number"
                min="0"
                class="w-24 h-6 px-1.5 rounded-xs border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-sm"
              />
            </label>
          </div>

          <div class="flex items-center gap-gutter-md text-light-on-surface-variant shrink-0">
            <span class="font-body text-body-sm">
              Titular:
              <strong class="font-semibold text-light-on-surface">
                {{ draft.selectedVehicle.customerName }}
              </strong>
              ({{ draft.selectedVehicle.customerDocumentType }} {{ draft.selectedVehicle.customerDocumentNumber }})
            </span>
          </div>
        </div>

        <!-- Smart Preventive Kit Highlight Banner (EXT01) -->
        <div
          v-if="draft.selectedVehicle?.suggestedPreventiveKit"
          class="flex items-center justify-between gap-gutter-sm px-gutter-md py-gutter-xs rounded-sm bg-info-container border border-light-outline-variant"
        >
          <div class="flex items-center gap-gutter-sm min-w-0">
            <span class="material-symbols-outlined text-[18px] text-info shrink-0">auto_awesome</span>
            <p class="font-body text-body-md text-on-info-container truncate">
              Sugerencia Preventiva:
              <strong>{{ draft.selectedVehicle.suggestedPreventiveKit.name }}</strong>
              (S/ {{ draft.selectedVehicle.suggestedPreventiveKit.estimatedKitTotalIgv.toFixed(2) }} inc. IGV)
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1 h-7 px-gutter-md rounded-sm bg-info text-on-info font-label text-label-md hover:opacity-90 shrink-0"
            @click="applySuggestedKit"
          >
            <span class="material-symbols-outlined text-[15px]">playlist_add</span>
            <span>Cargar Kit</span>
          </button>
        </div>
      </section>

      <!-- STEP 2: Compatible Parts & Labor Catalog -->
      <section
        class="bg-light-surface-container-lowest border border-light-outline-variant rounded flex flex-col overflow-hidden"
      >
        <div
          class="px-gutter-md pt-gutter-sm border-b border-light-outline-variant flex items-center justify-between gap-gutter-md flex-wrap"
        >
          <div class="flex items-center gap-gutter-md">
            <span
              class="inline-flex items-center justify-center w-5 h-5 rounded-xs bg-light-primary text-light-on-primary font-label text-label-sm"
            >
              2
            </span>
            <div role="tablist" class="flex items-center gap-gutter-md">
              <button
                type="button"
                role="tab"
                class="pb-gutter-sm border-b-2 font-label text-label-lg transition-colors"
                :class="
                  activeTab === 'PARTS'
                    ? 'border-light-primary text-light-primary'
                    : 'border-transparent text-light-on-surface-variant hover:text-light-on-surface'
                "
                @click="activeTab = 'PARTS'"
              >
                Repuestos Compatibles ({{ filteredParts.length }})
              </button>
              <button
                type="button"
                role="tab"
                class="pb-gutter-sm border-b-2 font-label text-label-lg transition-colors"
                :class="
                  activeTab === 'LABOR'
                    ? 'border-light-primary text-light-primary'
                    : 'border-transparent text-light-on-surface-variant hover:text-light-on-surface'
                "
                @click="activeTab = 'LABOR'"
              >
                Mano de Obra ({{ laborRates.length }})
              </button>
            </div>
          </div>

          <span class="font-body text-body-sm text-light-on-surface-variant pb-gutter-xs">
            Precios en Soles (S/) inc. IGV 18%
          </span>
        </div>

        <!-- TAB 1: PARTS -->
        <div v-if="activeTab === 'PARTS'" class="flex flex-col">
          <div
            class="px-gutter-md py-gutter-sm bg-light-surface-container-low border-b border-light-outline-variant flex items-center justify-between gap-gutter-sm flex-wrap"
          >
            <div class="relative flex-1 min-w-[200px] max-w-xs">
              <span
                class="material-symbols-outlined text-[16px] text-light-on-surface-variant absolute left-2.5 top-2 pointer-events-none"
              >
                qr_code_scanner
              </span>
              <input
                v-model="catalogQuery"
                type="search"
                placeholder="Buscar OEM, SKU o repuesto..."
                class="w-full h-8 pl-8 pr-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-md focus:border-light-primary focus:ring-1 focus:ring-light-primary"
              />
            </div>

            <div class="flex items-center gap-gutter-xs flex-wrap">
              <button
                v-for="cat in categories"
                :key="cat"
                type="button"
                class="px-2.5 py-1 rounded-full font-label text-label-sm transition-colors"
                :class="
                  activeCategory === cat
                    ? 'bg-light-secondary text-light-on-secondary'
                    : 'bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface-variant hover:bg-light-surface-container'
                "
                @click="activeCategory = cat"
              >
                {{ cat }}
              </button>
            </div>
          </div>

          <div class="pos-scroll overflow-y-auto max-h-[370px]">
            <table class="w-full border-collapse text-left">
              <thead class="sticky top-0 z-10 bg-light-surface-container-low border-b border-light-outline-variant">
                <tr>
                  <th class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                    SKU / OEM Ref
                  </th>
                  <th class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                    Repuesto & Marca
                  </th>
                  <th class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                    Stock
                  </th>
                  <th
                    class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                  >
                    Precio (S/)
                  </th>
                  <th
                    class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                  >
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-light-outline-variant">
                <tr
                  v-for="part in filteredParts"
                  :key="part.id"
                  class="hover:bg-light-surface-container-low transition-colors"
                >
                  <td class="px-gutter-sm py-2 align-middle">
                    <div class="font-mono text-mono-md text-light-on-surface">{{ part.sku }}</div>
                    <div class="font-mono text-mono-sm text-light-on-surface-variant">
                      OEM: {{ part.oemReferenceCode }}
                    </div>
                  </td>
                  <td class="px-gutter-sm py-2 align-middle">
                    <div class="font-title text-title-sm text-light-on-surface">{{ part.name }}</div>
                    <span
                      class="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-xs font-label text-label-sm uppercase"
                      :class="
                        part.brand === 'TOYOTA_OEM'
                          ? 'bg-light-primary-container text-light-on-primary-container'
                          : 'bg-light-secondary-container text-light-on-secondary-container'
                      "
                    >
                      {{ part.brand.replace('_', ' ') }}
                    </span>
                  </td>
                  <td class="px-gutter-sm py-2 align-middle">
                    <div class="flex flex-col items-start gap-1">
                      <span
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label text-label-sm"
                        :class="{
                          'bg-success-container text-on-success-container': part.alertLevel === 'NORMAL',
                          'bg-warning-container text-on-warning-container': part.alertLevel === 'ALERTA',
                          'bg-light-error-container text-light-on-error-container': part.alertLevel === 'CRITICO',
                        }"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full"
                          :class="{
                            'bg-success': part.alertLevel === 'NORMAL',
                            'bg-warning': part.alertLevel === 'ALERTA',
                            'bg-light-error': part.alertLevel === 'CRITICO',
                          }"
                        ></span>
                        {{
                          part.currentStock === 0
                            ? 'Agotado (0)'
                            : `${part.alertLevel} (${part.currentStock})`
                        }}
                      </span>

                      <button
                        v-if="part.currentStock === 0 && part.availableEquivalents.length > 0"
                        type="button"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs border border-light-primary text-light-primary bg-light-surface-container-lowest font-label text-label-sm hover:bg-light-primary-container"
                        @click="showEquivalentsInTable(part.oemReferenceCode)"
                      >
                        Ver {{ part.availableEquivalents.length }} Equivalente(s)
                      </button>
                    </div>
                  </td>
                  <td class="px-gutter-sm py-2 align-middle text-right">
                    <div class="font-mono text-mono-md tabular-nums text-light-on-surface">
                      S/ {{ part.salePriceIgv.toFixed(2) }}
                    </div>
                    <div class="font-body text-body-sm text-light-on-surface-variant">(inc. IGV)</div>
                  </td>
                  <td class="px-gutter-sm py-2 align-middle text-right">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm font-label text-label-sm transition-colors"
                      :class="
                        part.currentStock > 0
                          ? 'bg-light-primary text-light-on-primary hover:opacity-90'
                          : 'bg-light-surface-container text-light-on-surface-variant hover:bg-light-primary-container hover:text-light-on-primary-container'
                      "
                      :title="
                        part.currentStock === 0
                          ? 'Agregar a proforma pendiente (requerirá stock o equivalente al aprobar)'
                          : 'Agregar a la proforma'
                      "
                      @click="draft.addPart(part)"
                    >
                      {{ part.currentStock > 0 ? '+ Agregar' : '+ Cotizar s/stock' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 2: LABOR RATES -->
        <div v-else class="pos-scroll overflow-y-auto max-h-[415px]">
          <table class="w-full border-collapse text-left">
            <thead class="sticky top-0 z-10 bg-light-surface-container-low border-b border-light-outline-variant">
              <tr>
                <th class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                  Código
                </th>
                <th class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                  Servicio Estándar Toyota
                </th>
                <th class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                  Tiempo Est.
                </th>
                <th
                  class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                >
                  Tarifa (S/)
                </th>
                <th
                  class="px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                >
                  Acción
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-light-outline-variant">
              <tr
                v-for="lr in laborRates"
                :key="lr.id"
                class="hover:bg-light-surface-container-low transition-colors"
              >
                <td class="px-gutter-sm py-2 font-mono text-mono-md">{{ lr.code }}</td>
                <td class="px-gutter-sm py-2 font-title text-title-sm">{{ lr.serviceName }}</td>
                <td class="px-gutter-sm py-2 font-body text-body-sm text-light-on-surface-variant">
                  {{ lr.estimatedHours }} hrs
                </td>
                <td class="px-gutter-sm py-2 text-right font-mono text-mono-md tabular-nums">
                  S/ {{ lr.priceIgv.toFixed(2) }}
                </td>
                <td class="px-gutter-sm py-2 text-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm bg-light-primary text-light-on-primary font-label text-label-sm hover:opacity-90"
                    @click="draft.addLabor(lr)"
                  >
                    + Agregar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- RIGHT COLUMN (38%): Step 3 Fixed-Height Live Quote Ticket + @media print support -->
    <aside
      class="print-ticket bg-light-surface-container-lowest border border-light-outline-variant rounded flex flex-col lg:h-[680px] overflow-hidden"
    >
      <!-- Print-only Header -->
      <div class="hidden print-only p-4 border-b border-light-outline-variant">
        <h1 class="font-headline text-headline-lg">{{ workshopConfig.settings.businessName }}</h1>
        <p class="font-body text-body-sm">
          RUC: {{ workshopConfig.settings.ruc }} • {{ workshopConfig.settings.address }} • Tel:
          {{ workshopConfig.settings.phone }}
        </p>
        <p v-if="draft.selectedVehicle" class="font-mono text-mono-sm mt-1">
          Cliente: {{ draft.selectedVehicle.customerName }} ({{ draft.selectedVehicle.customerDocumentNumber }}) |
          Vehículo: Toyota {{ draft.selectedVehicle.model }} ({{ draft.selectedVehicle.licensePlate }})
        </p>
      </div>

      <!-- Ticket Header -->
      <header
        class="px-gutter-md py-gutter-sm border-b border-light-outline-variant bg-light-surface-container-low flex items-center justify-between gap-gutter-sm shrink-0"
      >
        <div class="flex items-center gap-gutter-sm min-w-0">
          <span
            class="no-print inline-flex items-center justify-center w-5 h-5 rounded-xs bg-light-primary text-light-on-primary font-label text-label-sm shrink-0"
          >
            3
          </span>
          <div class="min-w-0">
            <h2 class="font-title text-title-sm text-light-on-surface truncate">
              {{ draft.editingQuoteNumber ? `Proforma ${draft.editingQuoteNumber}` : 'Nueva Proforma Comercial' }}
            </h2>
            <p class="font-body text-body-sm text-light-on-surface-variant">
              Vigencia: {{ workshopConfig.settings.quoteValidityDays }} días • {{ draft.totalUnitsCount }} u.
            </p>
          </div>
        </div>

        <div class="no-print flex items-center gap-1.5 shrink-0">
          <span
            class="px-2 py-0.5 rounded-full bg-light-primary-container text-light-on-primary-container font-label text-label-sm"
          >
            {{ draft.editingQuoteId ? 'Editando' : 'En Borrador' }}
          </span>
          <button
            v-if="draft.items.length > 0 || draft.editingQuoteId"
            type="button"
            title="Limpiar ticket"
            class="w-6 h-6 rounded-xs border border-light-outline-variant text-light-on-surface-variant hover:bg-light-surface-container inline-flex items-center justify-center"
            @click="draft.clearDraft()"
          >
            <span class="material-symbols-outlined text-[14px]">restart_alt</span>
          </button>
        </div>
      </header>

      <!-- Scrollable Compact Item List -->
      <div class="flex-1 min-h-0 pos-scroll overflow-y-auto divide-y divide-light-outline-variant px-gutter-md">
        <div
          v-if="draft.items.length === 0"
          class="py-10 text-center font-body text-body-md text-light-on-surface-variant"
        >
          No hay ítems en la proforma. Selecciona repuestos compatibles, un Kit sugerido o mano de obra.
        </div>

        <div
          v-for="(item, idx) in draft.items"
          :key="`${item.itemType}-${item.code}`"
          class="py-2 flex items-center justify-between gap-gutter-sm"
        >
          <div class="min-w-0 flex-1">
            <div class="font-title text-title-sm text-light-on-surface truncate">{{ item.description }}</div>
            <div class="flex items-center gap-2 font-mono text-mono-sm text-light-on-surface-variant">
              <span>{{ item.code }}</span>
              <span>•</span>
              <span class="tabular-nums">S/ {{ item.unitPriceIgv.toFixed(2) }} c/u</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <div
              class="no-print inline-flex items-center border border-light-outline-variant rounded-xs bg-light-surface-container-low"
            >
              <button
                type="button"
                class="w-6 h-6 flex items-center justify-center hover:bg-light-surface-container font-label text-label-md"
                @click="draft.updateQuantity(idx, -1)"
              >
                −
              </button>
              <span class="w-6 text-center font-mono text-mono-sm tabular-nums">{{ item.quantity }}</span>
              <button
                type="button"
                class="w-6 h-6 flex items-center justify-center hover:bg-light-surface-container font-label text-label-md"
                @click="draft.updateQuantity(idx, 1)"
              >
                +
              </button>
            </div>

            <span class="w-16 text-right font-mono text-mono-md tabular-nums text-light-on-surface">
              S/ {{ (item.unitPriceIgv * item.quantity).toFixed(2) }}
            </span>

            <button
              type="button"
              class="no-print w-6 h-6 inline-flex items-center justify-center rounded-xs text-light-on-surface-variant hover:text-light-error hover:bg-light-error-container"
              @click="draft.removeItem(idx)"
            >
              <span class="material-symbols-outlined text-[15px]">delete</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Discount & Tax Breakdown -->
      <div
        class="px-gutter-md py-gutter-sm border-t border-light-outline-variant bg-light-surface-container-low flex flex-col gap-gutter-xs shrink-0"
      >
        <div class="no-print flex items-center justify-between gap-gutter-sm pb-gutter-xs border-b border-light-outline-variant">
          <div class="flex flex-col">
            <label for="discount-input" class="font-label text-label-md text-light-on-surface">
              Descuento Mostrador (%)
            </label>
            <span class="font-body text-body-sm text-light-on-surface-variant">
              Tope máx. {{ auth.maxDiscountPercent }}% ({{ auth.role }})
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <input
              id="discount-input"
              :value="draft.discountPercent"
              type="number"
              min="0"
              :max="auth.maxDiscountPercent"
              step="1"
              class="w-16 h-7 px-2 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md text-right tabular-nums"
              @input="handleDiscountInput"
            />
            <span class="font-mono text-mono-md text-light-on-surface-variant">%</span>
          </div>
        </div>

        <div class="flex items-center justify-between text-light-on-surface-variant">
          <span class="font-body text-body-sm">Subtotal sin IGV (S/)</span>
          <span class="font-mono text-mono-md tabular-nums">S/ {{ draft.taxableSubtotal.toFixed(2) }}</span>
        </div>

        <div v-if="draft.discountAmount > 0" class="flex items-center justify-between text-light-primary">
          <span class="font-body text-body-sm">Descuento ({{ draft.discountPercent }}%)</span>
          <span class="font-mono text-mono-md tabular-nums">- S/ {{ draft.discountAmount.toFixed(2) }}</span>
        </div>

        <div class="flex items-center justify-between text-light-on-surface-variant">
          <span class="font-body text-body-sm">IGV 18% incluido (S/)</span>
          <span class="font-mono text-mono-md tabular-nums">S/ {{ draft.igvAmount.toFixed(2) }}</span>
        </div>

        <div class="flex items-baseline justify-between pt-gutter-xs border-t border-light-outline-variant">
          <span class="font-headline text-headline-md text-light-on-surface">Total a Pagar</span>
          <span class="font-display text-display-lg tabular-nums text-light-on-surface">
            S/ {{ draft.finalTotalIgv.toFixed(2) }}
          </span>
        </div>
      </div>

      <!-- Bottom Fixed Action Grid -->
      <footer
        class="no-print p-gutter-md border-t border-light-outline-variant bg-light-surface-container-lowest flex flex-col gap-gutter-sm shrink-0"
      >
        <button
          type="button"
          :disabled="saving || draft.items.length === 0"
          class="w-full h-10 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-lg flex items-center justify-center gap-gutter-xs hover:opacity-90 disabled:opacity-50"
          @click="saveAndApproveSale"
        >
          <span class="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Aprobar Venta (Descontar Stock)</span>
        </button>

        <button
          type="button"
          :disabled="saving || draft.items.length === 0"
          class="w-full h-8 px-gutter-md rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface font-label text-label-md flex items-center justify-center gap-gutter-xs hover:bg-light-surface-container-low disabled:opacity-50"
          @click="saveQuoteAsPending"
        >
          <span class="material-symbols-outlined text-[16px]">bookmark</span>
          <span>{{ draft.editingQuoteId ? 'Actualizar Pendiente' : 'Guardar Pendiente' }}</span>
        </button>

        <div class="grid grid-cols-2 gap-gutter-sm">
          <button
            type="button"
            :disabled="saving || draft.items.length === 0"
            class="h-8 px-gutter-sm rounded-sm bg-light-surface-container-low border border-light-outline-variant text-light-on-surface font-label text-label-md flex items-center justify-center gap-1.5 hover:bg-light-surface-container disabled:opacity-50"
            @click="downloadPdfOrPrintFallback"
          >
            <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            <span>Descargar PDF</span>
          </button>

          <button
            type="button"
            :disabled="saving || draft.items.length === 0"
            class="h-8 px-gutter-sm rounded-sm bg-success text-on-success font-label text-label-md flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50"
            @click="sendViaWhatsApp"
          >
            <span class="material-symbols-outlined text-[16px]">chat</span>
            <span>Enviar WhatsApp</span>
          </button>
        </div>
      </footer>
    </aside>

    <CustomerVehicleQuickModal
      :open="showNewCustomerModal"
      @close="showNewCustomerModal = false"
      @created="onVehicleCreated"
    />

    <StockConflictModal
      :open="conflictModalOpen"
      :quote-number="conflictQuoteNumber"
      :conflicts="conflicts"
      :busy="saving"
      @close="conflictModalOpen = false"
      @substitute="handleSubstituteAndApprove"
    />
  </main>
</template>
