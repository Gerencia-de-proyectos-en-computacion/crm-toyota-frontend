import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { DraftCartLine, MaintenanceKit, QuoteResponse, VehicleItem } from '@/types/crm'

const DRAFT_STORAGE_KEY = 'crm_toyota_pos_draft_v1'

interface PersistedDraft {
  editingQuoteId: number | null
  editingQuoteNumber: string | null
  selectedVehicle: VehicleItem | null
  mileageAtQuote: number
  discountPercent: number
  notes: string
  items: DraftCartLine[]
  savedAtIso: string
}

export const useQuoteDraftStore = defineStore('quoteDraft', () => {
  const editingQuoteId = ref<number | null>(null)
  const editingQuoteNumber = ref<string | null>(null)
  const selectedVehicle = ref<VehicleItem | null>(null)
  const mileageAtQuote = ref<number>(0)
  const discountPercent = ref<number>(0)
  const notes = ref<string>('')
  const items = ref<DraftCartLine[]>([])
  const lastAutosavedLabel = ref<string>('Listo para autoguardado (5s)')

  function restoreFromStorage() {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PersistedDraft
      editingQuoteId.value = parsed.editingQuoteId
      editingQuoteNumber.value = parsed.editingQuoteNumber
      selectedVehicle.value = parsed.selectedVehicle
      mileageAtQuote.value = parsed.mileageAtQuote || 0
      discountPercent.value = parsed.discountPercent || 0
      notes.value = parsed.notes || ''
      items.value = Array.isArray(parsed.items) ? parsed.items : []
      lastAutosavedLabel.value = 'Borrador recuperado de LocalStorage'
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    }
  }

  const persistNow = () => {
    if (typeof localStorage === 'undefined') return
    const payload: PersistedDraft = {
      editingQuoteId: editingQuoteId.value,
      editingQuoteNumber: editingQuoteNumber.value,
      selectedVehicle: selectedVehicle.value,
      mileageAtQuote: mileageAtQuote.value,
      discountPercent: discountPercent.value,
      notes: notes.value,
      items: items.value,
      savedAtIso: new Date().toISOString(),
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
    const hhmmss = new Date().toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    lastAutosavedLabel.value = `Borrador autoguardado (${hhmmss})`
  }

  // Autoguardado reactivo cada 5 segundos (@vueuse/core — RNF04)
  const debouncedSave = useDebounceFn(persistNow, 5000)

  watch(
    [editingQuoteId, selectedVehicle, mileageAtQuote, discountPercent, notes, items],
    () => {
      debouncedSave()
    },
    { deep: true },
  )

  const totalUnitsCount = computed(() => items.value.reduce((acc, i) => acc + i.quantity, 0))

  const grossTotalIgv = computed(() =>
    round2(items.value.reduce((sum, i) => sum + i.unitPriceIgv * i.quantity, 0)),
  )

  const discountAmount = computed(() =>
    round2((grossTotalIgv.value * clampDiscount(discountPercent.value)) / 100),
  )

  const finalTotalIgv = computed(() => round2(grossTotalIgv.value - discountAmount.value))
  const taxableSubtotal = computed(() => round2(finalTotalIgv.value / 1.18))
  const igvAmount = computed(() => round2(finalTotalIgv.value - taxableSubtotal.value))

  function setVehicle(v: VehicleItem) {
    selectedVehicle.value = v
    mileageAtQuote.value = v.currentMileageKm
  }

  function addPart(part: { id: number; sku: string; name: string; brand: string; salePriceIgv: number }) {
    const existing = items.value.find((i) => i.itemType === 'PART' && i.partId === part.id)
    if (existing) {
      existing.quantity += 1
    } else {
      items.value.push({
        itemType: 'PART',
        partId: part.id,
        laborRateId: null,
        code: part.sku,
        description: `${part.name} (${part.brand})`,
        unitPriceIgv: part.salePriceIgv,
        quantity: 1,
      })
    }
  }

  function addLabor(labor: { id: number; code: string; serviceName: string; priceIgv: number }) {
    const existing = items.value.find((i) => i.itemType === 'LABOR' && i.laborRateId === labor.id)
    if (existing) {
      existing.quantity += 1
    } else {
      items.value.push({
        itemType: 'LABOR',
        partId: null,
        laborRateId: labor.id,
        code: labor.code,
        description: labor.serviceName,
        unitPriceIgv: labor.priceIgv,
        quantity: 1,
      })
    }
  }

  function loadPreventiveKit(kit: MaintenanceKit) {
    for (const p of kit.parts) {
      const existing = items.value.find((i) => i.itemType === 'PART' && i.partId === p.partId)
      if (!existing) {
        items.value.push({
          itemType: 'PART',
          partId: p.partId,
          laborRateId: null,
          code: p.sku,
          description: `${p.name} (${p.brand})`,
          unitPriceIgv: p.unitPriceIgv,
          quantity: p.quantity,
        })
      }
    }
    addLabor(kit.laborRate)
  }

  function updateQuantity(index: number, delta: number) {
    const target = items.value[index]
    if (!target) return
    target.quantity += delta
    if (target.quantity <= 0) {
      items.value.splice(index, 1)
    }
  }

  function removeItem(index: number) {
    items.value.splice(index, 1)
  }

  function setCappedDiscount(rawPct: number, maxAllowed: number) {
    const clean = Number.isFinite(rawPct) ? rawPct : 0
    discountPercent.value = Math.min(maxAllowed, Math.max(0, clean))
  }

  function loadExistingQuoteForEdit(quote: QuoteResponse, vehicle: VehicleItem) {
    editingQuoteId.value = quote.id
    editingQuoteNumber.value = quote.quoteNumber
    selectedVehicle.value = vehicle
    mileageAtQuote.value = quote.mileageAtQuote
    discountPercent.value = quote.discountPercent
    notes.value = quote.notes ?? ''
    items.value = quote.items.map((qi) => ({
      itemType: qi.itemType,
      partId: qi.partId,
      laborRateId: qi.laborRateId,
      code: qi.itemCode,
      description: qi.description,
      unitPriceIgv: qi.unitPriceIgv,
      quantity: qi.quantity,
    }))
    persistNow()
  }

  function clearDraft() {
    editingQuoteId.value = null
    editingQuoteNumber.value = null
    discountPercent.value = 0
    notes.value = ''
    items.value = []
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    }
    lastAutosavedLabel.value = 'Borrador limpio'
  }

  restoreFromStorage()

  return {
    editingQuoteId,
    editingQuoteNumber,
    selectedVehicle,
    mileageAtQuote,
    discountPercent,
    notes,
    items,
    lastAutosavedLabel,
    totalUnitsCount,
    grossTotalIgv,
    discountAmount,
    finalTotalIgv,
    taxableSubtotal,
    igvAmount,
    setVehicle,
    addPart,
    addLabor,
    loadPreventiveKit,
    updateQuantity,
    removeItem,
    setCappedDiscount,
    loadExistingQuoteForEdit,
    clearDraft,
    persistNow,
  }
})

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function clampDiscount(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 15) return 15
  return n
}
