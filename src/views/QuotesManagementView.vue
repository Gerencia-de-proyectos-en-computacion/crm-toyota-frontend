<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import type {
  QuoteResponse,
  QuoteStatus,
  RejectionReason,
  StockConflictDetail,
  VehicleItem,
} from '@/types/crm'
import { api, extractErrorMessage } from '@/services/api'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useToastStore } from '@/stores/toast'
import StockConflictModal from '@/components/StockConflictModal.vue'
import RejectQuoteModal from '@/components/RejectQuoteModal.vue'

const router = useRouter()
const draft = useQuoteDraftStore()
const toast = useToastStore()

const quotes = ref<QuoteResponse[]>([])
const activeStatus = ref<'ALL' | QuoteStatus>('ALL')
const searchQuery = ref('')
const busy = ref(false)

const conflictModalOpen = ref(false)
const conflictQuoteId = ref<number | null>(null)
const conflictQuoteNumber = ref('')
const conflicts = ref<StockConflictDetail[]>([])

const rejectModalOpen = ref(false)
const rejectingQuote = ref<QuoteResponse | null>(null)

const filteredQuotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return quotes.value.filter((row) => {
    const statusOk = activeStatus.value === 'ALL' || row.status === activeStatus.value
    const searchOk =
      !q ||
      row.quoteNumber.toLowerCase().includes(q) ||
      row.licensePlate.toLowerCase().includes(q) ||
      row.customerDocumentNumber.toLowerCase().includes(q) ||
      row.customerName.toLowerCase().includes(q)
    return statusOk && searchOk
  })
})

const tabs: { key: 'ALL' | QuoteStatus; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'PENDIENTE', label: 'Pendientes' },
  { key: 'APROBADA', label: 'Aprobadas' },
  { key: 'CERRADA', label: 'Cerradas' },
  { key: 'RECHAZADA', label: 'Rechazadas' },
]

async function fetchQuotes() {
  try {
    const { data } = await api.get<QuoteResponse[]>('/api/v1/quotes')
    quotes.value = data
  } catch (err) {
    toast.show(extractErrorMessage(err, 'Error consultando cotizaciones'), 'error')
  }
}

async function editInPos(quote: QuoteResponse) {
  const { data: vehs } = await api.get<VehicleItem[]>('/api/v1/vehicles', {
    params: { q: quote.licensePlate },
  })
  const matched = vehs.find((v) => v.id === quote.vehicleId) || vehs[0]
  if (!matched) {
    toast.show('No se encontró el vehículo asociado', 'error')
    return
  }
  draft.loadExistingQuoteForEdit(quote, matched)
  router.push('/pos')
}

async function approveQuote(quote: QuoteResponse) {
  busy.value = true
  try {
    await api.post(`/api/v1/quotes/${quote.id}/approve`)
    toast.show(`Proforma ${quote.quoteNumber} APROBADA • Stock descontado`)
    await fetchQuotes()
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      const body = err.response.data as { quoteNumber?: string; conflicts?: StockConflictDetail[] }
      if (body.conflicts && body.conflicts.length > 0) {
        conflictQuoteId.value = quote.id
        conflictQuoteNumber.value = body.quoteNumber || quote.quoteNumber
        conflicts.value = body.conflicts
        conflictModalOpen.value = true
        return
      }
    }
    toast.show(extractErrorMessage(err), 'error')
  } finally {
    busy.value = false
  }
}

async function handleSubstitute(missingPartId: number, replacementPartId: number) {
  if (!conflictQuoteId.value) return
  busy.value = true
  try {
    await api.post(`/api/v1/quotes/${conflictQuoteId.value}/substitute-part`, {
      missingPartId,
      replacementPartId,
      autoApproveAfterSubstitute: true,
    })
    conflictModalOpen.value = false
    toast.show('Sustitución aplicada y cotización APROBADA')
    await fetchQuotes()
  } catch (err) {
    toast.show(extractErrorMessage(err), 'error')
  } finally {
    busy.value = false
  }
}

function openRejectModal(quote: QuoteResponse) {
  rejectingQuote.value = quote
  rejectModalOpen.value = true
}

async function confirmReject(reason: RejectionReason, notes: string) {
  if (!rejectingQuote.value) return
  busy.value = true
  try {
    const wasApproved = rejectingQuote.value.status === 'APROBADA'
    await api.post(`/api/v1/quotes/${rejectingQuote.value.id}/reject`, {
      rejectionReason: reason,
      rejectionNotes: notes || null,
    })
    rejectModalOpen.value = false
    toast.show(
      wasApproved
        ? 'Cotización anulada y stock reintegrado al almacén'
        : 'Cotización marcada como RECHAZADA',
    )
    await fetchQuotes()
  } catch (err) {
    toast.show(extractErrorMessage(err), 'error')
  } finally {
    busy.value = false
  }
}

async function closeQuote(quote: QuoteResponse) {
  busy.value = true
  try {
    await api.post(`/api/v1/quotes/${quote.id}/close`)
    toast.show(`Proforma ${quote.quoteNumber} marcada como CERRADA`)
    await fetchQuotes()
  } catch (err) {
    toast.show(extractErrorMessage(err), 'error')
  } finally {
    busy.value = false
  }
}

async function downloadPdf(quote: QuoteResponse) {
  try {
    const res = await api.get<Blob>(`/api/v1/quotes/${quote.id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quote.quoteNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    toast.show(extractErrorMessage(err, 'Error descargando PDF'), 'error')
  }
}

function openWhatsApp(quote: QuoteResponse) {
  window.open(quote.whatsappUrl, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  fetchQuotes()
})
</script>

<template>
  <main class="p-gutter-md flex flex-col gap-gutter-md">
    <div
      class="bg-light-surface-container-lowest border border-light-outline-variant rounded px-gutter-lg py-gutter-sm flex items-center justify-between gap-gutter-md flex-wrap"
    >
      <div>
        <h2 class="font-headline text-headline-lg text-light-on-surface">
          Gestión de Cotizaciones de Mostrador
        </h2>
        <p class="font-body text-body-sm text-light-on-surface-variant">
          Seguimiento de proformas emitidas, control atómico de stock y motivos de rechazo
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-lg hover:opacity-90"
        @click="router.push('/pos')"
      >
        <span class="material-symbols-outlined text-[18px]">add</span>
        <span>Nueva Cotización POS</span>
      </button>
    </div>

    <section
      class="bg-light-surface-container-lowest border border-light-outline-variant rounded flex flex-col overflow-hidden"
    >
      <div
        class="px-gutter-md pt-gutter-sm border-b border-light-outline-variant flex items-center justify-between gap-gutter-md flex-wrap"
      >
        <div role="tablist" class="flex items-center gap-gutter-md">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            class="pb-gutter-sm border-b-2 font-label text-label-lg transition-colors"
            :class="
              activeStatus === t.key
                ? 'border-light-primary text-light-primary'
                : 'border-transparent text-light-on-surface-variant hover:text-light-on-surface'
            "
            @click="activeStatus = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <div class="relative w-72 pb-gutter-xs">
          <span
            class="material-symbols-outlined text-[16px] text-light-on-surface-variant absolute left-2.5 top-2 pointer-events-none"
          >
            search
          </span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Buscar COT-2026, placa o DNI/RUC..."
            class="w-full h-8 pl-8 pr-3 rounded-sm border border-light-outline-variant bg-light-surface-container-low font-body text-body-sm"
          />
        </div>
      </div>

      <div class="pos-scroll overflow-y-auto max-h-[520px]">
        <table class="w-full border-collapse text-left table-fixed">
          <thead class="sticky top-0 z-10 bg-light-surface-container-low border-b border-light-outline-variant">
            <tr>
              <th class="w-[14%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                N° Proforma
              </th>
              <th class="w-[13%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Vigencia / Detalle
              </th>
              <th class="w-[18%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Cliente
              </th>
              <th class="w-[19%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Vehículo Toyota
              </th>
              <th
                class="w-[11%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
              >
                Total S/ (IGV)
              </th>
              <th
                class="w-[10%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-center"
              >
                Estado
              </th>
              <th
                class="w-[15%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-light-outline-variant">
            <tr
              v-for="q in filteredQuotes"
              :key="q.id"
              class="hover:bg-light-surface-container-low transition-colors"
            >
              <td class="px-gutter-sm py-2.5 font-mono text-mono-md">{{ q.quoteNumber }}</td>
              <td class="px-gutter-sm py-2.5">
                <div class="font-body text-body-sm text-light-on-surface">Vence: {{ q.validUntil }}</div>
                <div class="font-body text-body-sm text-light-on-surface-variant truncate">
                  {{
                    q.status === 'RECHAZADA'
                      ? `Motivo: ${q.rejectionReason}`
                      : q.status === 'CERRADA'
                        ? 'Cierre Comercial'
                        : `${q.items.length} ítem(s)`
                  }}
                </div>
              </td>
              <td class="px-gutter-sm py-2.5">
                <div class="font-title text-title-sm truncate">{{ q.customerName }}</div>
                <div class="font-mono text-mono-sm text-light-on-surface-variant">
                  {{ q.customerDocumentType }} {{ q.customerDocumentNumber }}
                </div>
              </td>
              <td class="px-gutter-sm py-2.5">
                <div class="flex items-center gap-1.5">
                  <span
                    class="px-1.5 py-0.5 rounded-xs bg-light-on-surface text-light-surface-bright font-mono text-mono-sm shrink-0"
                  >
                    {{ q.licensePlate }}
                  </span>
                  <span class="font-body text-body-sm truncate">{{ q.vehicleSummary }}</span>
                </div>
              </td>
              <td class="px-gutter-sm py-2.5 text-right font-mono text-mono-md tabular-nums">
                S/ {{ q.finalTotalIgv.toFixed(2) }}
              </td>
              <td class="px-gutter-sm py-2.5 text-center">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full font-label text-label-sm"
                  :class="{
                    'bg-warning-container text-on-warning-container': q.status === 'PENDIENTE',
                    'bg-success-container text-on-success-container': q.status === 'APROBADA',
                    'bg-light-secondary-container text-light-on-secondary-container': q.status === 'CERRADA',
                    'bg-light-error-container text-light-on-error-container': q.status === 'RECHAZADA',
                  }"
                >
                  {{ q.status }}
                </span>
              </td>
              <td class="px-gutter-sm py-2.5 text-right">
                <div class="inline-flex items-center justify-end gap-1">
                  <button
                    v-if="q.status === 'PENDIENTE'"
                    type="button"
                    title="Editar en POS"
                    class="w-7 h-7 rounded-xs border border-light-outline-variant text-light-on-surface-variant hover:bg-light-surface-container inline-flex items-center justify-center"
                    @click="editInPos(q)"
                  >
                    <span class="material-symbols-outlined text-[15px]">edit</span>
                  </button>

                  <button
                    v-if="q.status === 'PENDIENTE'"
                    type="button"
                    :disabled="busy"
                    title="Aprobar y descontar stock"
                    class="w-7 h-7 rounded-xs bg-light-primary text-light-on-primary hover:opacity-90 inline-flex items-center justify-center"
                    @click="approveQuote(q)"
                  >
                    <span class="material-symbols-outlined text-[15px]">check</span>
                  </button>

                  <button
                    v-if="q.status === 'APROBADA'"
                    type="button"
                    :disabled="busy"
                    title="Marcar como CERRADA"
                    class="w-7 h-7 rounded-xs bg-light-secondary text-light-on-secondary hover:opacity-90 inline-flex items-center justify-center"
                    @click="closeQuote(q)"
                  >
                    <span class="material-symbols-outlined text-[15px]">task_alt</span>
                  </button>

                  <button
                    v-if="q.status === 'PENDIENTE' || q.status === 'APROBADA'"
                    type="button"
                    :disabled="busy"
                    :title="q.status === 'APROBADA' ? 'Anular y reintegrar stock' : 'Rechazar'"
                    class="w-7 h-7 rounded-xs border border-light-outline-variant text-light-error hover:bg-light-error-container inline-flex items-center justify-center"
                    @click="openRejectModal(q)"
                  >
                    <span class="material-symbols-outlined text-[15px]">close</span>
                  </button>

                  <button
                    type="button"
                    title="Descargar PDF"
                    class="w-7 h-7 rounded-xs border border-light-outline-variant text-light-on-surface-variant hover:bg-light-surface-container inline-flex items-center justify-center"
                    @click="downloadPdf(q)"
                  >
                    <span class="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                  </button>

                  <button
                    type="button"
                    title="Enviar por WhatsApp"
                    class="w-7 h-7 rounded-xs bg-success text-on-success hover:opacity-90 inline-flex items-center justify-center"
                    @click="openWhatsApp(q)"
                  >
                    <span class="material-symbols-outlined text-[15px]">chat</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <StockConflictModal
      :open="conflictModalOpen"
      :quote-number="conflictQuoteNumber"
      :conflicts="conflicts"
      :busy="busy"
      @close="conflictModalOpen = false"
      @substitute="handleSubstitute"
    />

    <RejectQuoteModal
      v-if="rejectingQuote"
      :open="rejectModalOpen"
      :quote-number="rejectingQuote.quoteNumber"
      :customer-name="rejectingQuote.customerName"
      :current-status="rejectingQuote.status"
      :busy="busy"
      @close="rejectModalOpen = false"
      @confirm="confirmReject"
    />
  </main>
</template>
