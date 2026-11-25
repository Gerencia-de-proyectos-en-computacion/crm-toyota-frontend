<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { LaborRateItem, PartItem } from '@/types/crm'
import { api, extractErrorMessage } from '@/services/api'
import { useToastStore } from '@/stores/toast'
import PartPriceModal, { type PartFormPayload } from '@/components/PartPriceModal.vue'

const toast = useToastStore()

const activeTab = ref<'PARTS' | 'LABOR'>('PARTS')
const parts = ref<PartItem[]>([])
const laborRates = ref<LaborRateItem[]>([])
const activeCategory = ref('Todos')
const searchQuery = ref('')
const saving = ref(false)

const categories = ['Todos', 'Filtros', 'Frenos', 'Aceites', 'Encendido', 'Embrague']

// Part modal state
const partModalOpen = ref(false)
const editingPart = ref<PartItem | null>(null)

// Labor rate modal state
const laborModalOpen = ref(false)
const editingLabor = ref<LaborRateItem | null>(null)
const laborCode = ref('')
const laborName = ref('')
const laborHours = ref<number>(1)
const laborIntervalKm = ref<number | null>(null)
const laborPriceIgv = ref<number>(65)

const laborBaseSinIgv = computed(() => (Number(laborPriceIgv.value) || 0) / 1.18)
const laborIgvAmount = computed(() => (Number(laborPriceIgv.value) || 0) - laborBaseSinIgv.value)

const filteredParts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return parts.value.filter((p) => {
    const catOk = activeCategory.value === 'Todos' || p.category === activeCategory.value
    const textOk =
      !q ||
      p.sku.toLowerCase().includes(q) ||
      p.oemReferenceCode.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.compatibleSummary.toLowerCase().includes(q)
    return catOk && textOk
  })
})

const filteredLaborRates = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return laborRates.value
  return laborRates.value.filter(
    (l) => l.code.toLowerCase().includes(q) || l.serviceName.toLowerCase().includes(q),
  )
})

async function loadCatalog() {
  try {
    const [partsRes, laborRes] = await Promise.all([
      api.get<PartItem[]>('/api/v1/parts'),
      api.get<LaborRateItem[]>('/api/v1/labor-rates'),
    ])
    parts.value = partsRes.data
    laborRates.value = laborRes.data
  } catch (err) {
    toast.show(extractErrorMessage(err, 'Error cargando catálogo y tarifario'), 'error')
  }
}

function openNewItemModal() {
  if (activeTab.value === 'PARTS') {
    editingPart.value = null
    partModalOpen.value = true
  } else {
    editingLabor.value = null
    laborCode.value = ''
    laborName.value = ''
    laborHours.value = 1
    laborIntervalKm.value = null
    laborPriceIgv.value = 70
    laborModalOpen.value = true
  }
}

function openEditPart(part: PartItem) {
  editingPart.value = part
  partModalOpen.value = true
}

async function handleSavePart(payload: PartFormPayload, partId: number | null) {
  saving.value = true
  try {
    if (partId !== null) {
      await api.put<PartItem>(`/api/v1/parts/${partId}`, payload)
      toast.show(`Precio y datos de ${payload.sku} actualizados (S/ ${payload.salePriceIgv.toFixed(2)})`)
    } else {
      await api.post<PartItem>('/api/v1/parts', payload)
      toast.show(`Repuesto ${payload.sku} registrado en catálogo`)
    }
    partModalOpen.value = false
    await loadCatalog()
  } catch (err) {
    toast.show(extractErrorMessage(err, 'No se pudo guardar el repuesto'), 'error')
  } finally {
    saving.value = false
  }
}

function openEditLabor(lr: LaborRateItem) {
  editingLabor.value = lr
  laborCode.value = lr.code
  laborName.value = lr.serviceName
  laborHours.value = lr.estimatedHours
  laborIntervalKm.value = lr.intervalKm
  laborPriceIgv.value = Number(lr.priceIgv.toFixed(2))
  laborModalOpen.value = true
}

async function handleSaveLabor() {
  saving.value = true
  try {
    const payload = {
      code: laborCode.value.trim().toUpperCase(),
      serviceName: laborName.value.trim(),
      estimatedHours: Number(laborHours.value),
      intervalKm: laborIntervalKm.value && Number(laborIntervalKm.value) > 0 ? Number(laborIntervalKm.value) : null,
      priceIgv: Number(laborPriceIgv.value),
    }
    if (editingLabor.value) {
      await api.put<LaborRateItem>(`/api/v1/labor-rates/${editingLabor.value.id}`, payload)
      toast.show(`Tarifa ${payload.code} actualizada (S/ ${payload.priceIgv.toFixed(2)})`)
    } else {
      await api.post<LaborRateItem>('/api/v1/labor-rates', payload)
      toast.show(`Tarifa ${payload.code} registrada`)
    }
    laborModalOpen.value = false
    await loadCatalog()
  } catch (err) {
    toast.show(extractErrorMessage(err, 'No se pudo guardar la tarifa de mano de obra'), 'error')
  } finally {
    saving.value = false
  }
}

function brandBadgeClass(brand: string): string {
  if (brand === 'TOYOTA_OEM') return 'bg-light-primary-container text-light-on-primary-container'
  if (brand === 'ALTERNATIVO') return 'bg-info-container text-on-info-container'
  return 'bg-light-secondary-container text-light-on-secondary-container'
}

function stockTextClass(part: PartItem): string {
  if (part.alertLevel === 'CRITICO') return 'text-light-error font-semibold'
  if (part.alertLevel === 'ALERTA') return 'text-warning font-semibold'
  return 'text-light-on-surface'
}

onMounted(() => {
  loadCatalog()
})
</script>

<template>
  <main class="p-gutter-md flex flex-col gap-gutter-md">
    <!-- 1. Compact Header Card (Stitch 1:1) -->
    <section
      aria-label="Cabecera de catálogo"
      class="bg-light-surface-container-lowest border border-light-outline-variant rounded px-gutter-lg py-gutter-sm flex items-center justify-between gap-gutter-md flex-wrap"
    >
      <div>
        <h2 class="font-headline text-headline-lg text-light-on-surface">
          Catálogo de Repuestos y Lista de Precios
        </h2>
        <p class="font-body text-body-sm text-light-on-surface-variant">
          Gestión exclusiva de Administrador • Todos los precios de venta en Soles (S/) incluyen IGV (18%)
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-lg hover:opacity-90 shrink-0"
        @click="openNewItemModal"
      >
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
        <span>{{ activeTab === 'PARTS' ? 'Nuevo Repuesto' : 'Nueva Tarifa' }}</span>
      </button>
    </section>

    <!-- 2. Main Catalog & Pricing Card with Tabs, Category Pills & Search (Stitch 1:1) -->
    <section
      aria-label="Catálogo y tarifario"
      class="bg-light-surface-container-lowest border border-light-outline-variant rounded flex flex-col overflow-hidden"
    >
      <div
        class="px-gutter-md pt-gutter-sm border-b border-light-outline-variant flex items-center justify-between gap-gutter-md flex-wrap"
      >
        <div role="tablist" aria-label="Tipo de catálogo" class="flex items-center gap-gutter-md">
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'PARTS'"
            class="pb-gutter-sm border-b-2 font-label text-label-lg transition-colors"
            :class="
              activeTab === 'PARTS'
                ? 'border-light-primary text-light-primary'
                : 'border-transparent text-light-on-surface-variant hover:text-light-on-surface'
            "
            @click="activeTab = 'PARTS'"
          >
            Repuestos OEM y Equivalentes ({{ parts.length }})
          </button>

          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'LABOR'"
            class="pb-gutter-sm border-b-2 font-label text-label-lg transition-colors"
            :class="
              activeTab === 'LABOR'
                ? 'border-light-primary text-light-primary'
                : 'border-transparent text-light-on-surface-variant hover:text-light-on-surface'
            "
            @click="activeTab = 'LABOR'"
          >
            Tarifario de Mano de Obra ({{ laborRates.length }})
          </button>
        </div>

        <div class="flex items-center gap-gutter-sm flex-wrap pb-gutter-xs">
          <div v-if="activeTab === 'PARTS'" class="flex items-center gap-gutter-xs flex-wrap">
            <button
              v-for="cat in categories"
              :key="cat"
              type="button"
              class="px-2.5 py-1 rounded-full font-label text-label-sm transition-colors"
              :class="
                activeCategory === cat
                  ? 'bg-light-secondary text-light-on-secondary'
                  : 'bg-light-surface-container-low border border-light-outline-variant text-light-on-surface-variant hover:bg-light-surface-container'
              "
              @click="activeCategory = cat"
            >
              {{ cat }}
            </button>
          </div>

          <label class="relative flex items-center w-64">
            <span class="sr-only">Buscar SKU, código OEM o repuesto</span>
            <span
              class="material-symbols-outlined text-[16px] text-light-on-surface-variant absolute left-2.5 pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="
                activeTab === 'PARTS'
                  ? 'Buscar SKU, código OEM o repuesto...'
                  : 'Buscar código o servicio...'
              "
              class="w-full h-8 pl-8 pr-2 rounded-sm border border-light-outline-variant bg-light-surface-container-low font-body text-body-sm text-light-on-surface placeholder:text-light-on-surface-variant focus:border-light-primary focus:ring-1 focus:ring-light-primary"
            />
          </label>
        </div>
      </div>

      <!-- TAB 1: Parts 7-Column Compact Table (Zero Horizontal Scroll at 1366x768) -->
      <div v-if="activeTab === 'PARTS'" class="pos-scroll overflow-y-auto overflow-x-hidden max-h-[520px]">
        <table class="w-full border-collapse text-left table-fixed">
          <thead class="sticky top-0 z-10 bg-light-surface-container-low border-b border-light-outline-variant">
            <tr>
              <th class="w-[14%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                SKU / OEM Ref
              </th>
              <th class="w-[24%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Repuesto &amp; Marca
              </th>
              <th class="w-[18%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Modelos Compatibles
              </th>
              <th class="w-[12%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Stock / Mínimo
              </th>
              <th
                class="w-[12%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
              >
                Precio Venta (inc. IGV)
              </th>
              <th
                class="w-[10%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
              >
                Valor Base
              </th>
              <th
                class="w-[10%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
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
                <div class="font-mono text-mono-md text-light-on-surface truncate">{{ part.sku }}</div>
                <div class="font-mono text-mono-sm text-light-on-surface-variant truncate">
                  {{ part.oemReferenceCode }}
                </div>
              </td>
              <td class="px-gutter-sm py-2 align-middle">
                <div class="font-title text-title-sm text-light-on-surface truncate" :title="part.name">
                  {{ part.name }}
                </div>
                <span
                  class="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-xs font-label text-label-sm uppercase"
                  :class="brandBadgeClass(part.brand)"
                >
                  {{ part.brand.replace('_', ' ') }}
                </span>
              </td>
              <td
                class="px-gutter-sm py-2 align-middle font-body text-body-sm text-light-on-surface-variant truncate"
                :title="part.compatibleSummary"
              >
                {{ part.compatibleSummary }}
              </td>
              <td class="px-gutter-sm py-2 align-middle font-mono text-mono-sm tabular-nums" :class="stockTextClass(part)">
                {{ part.currentStock }} u. / mín. {{ part.minStock }}
              </td>
              <td class="px-gutter-sm py-2 align-middle text-right font-mono text-mono-md tabular-nums text-light-on-surface">
                <strong>S/ {{ part.salePriceIgv.toFixed(2) }}</strong>
              </td>
              <td
                class="px-gutter-sm py-2 align-middle text-right font-mono text-mono-sm tabular-nums text-light-on-surface-variant"
              >
                S/ {{ (part.salePriceIgv / 1.18).toFixed(2) }}
              </td>
              <td class="px-gutter-sm py-2 align-middle text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface font-label text-label-sm hover:bg-light-surface-container whitespace-nowrap"
                  @click="openEditPart(part)"
                >
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">edit</span>
                  <span>Editar</span>
                </button>
              </td>
            </tr>
            <tr v-if="filteredParts.length === 0">
              <td colspan="7" class="px-gutter-md py-8 text-center font-body text-body-md text-light-on-surface-variant">
                No hay repuestos que coincidan con el filtro seleccionado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TAB 2: Labor Rates 6-Column Compact Table (Stitch 1:1) -->
      <div v-else class="pos-scroll overflow-y-auto overflow-x-hidden max-h-[520px]">
        <table class="w-full border-collapse text-left table-fixed">
          <thead class="sticky top-0 z-10 bg-light-surface-container-low border-b border-light-outline-variant">
            <tr>
              <th class="w-[15%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Código
              </th>
              <th class="w-[35%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Servicio de Mano de Obra
              </th>
              <th class="w-[17%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase">
                Tiempo Estándar
              </th>
              <th
                class="w-[12%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
              >
                Tarifa (inc. IGV)
              </th>
              <th
                class="w-[11%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
              >
                Valor Base
              </th>
              <th
                class="w-[10%] px-gutter-sm py-2.5 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
              >
                Acción
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-light-outline-variant">
            <tr
              v-for="lr in filteredLaborRates"
              :key="lr.id"
              class="hover:bg-light-surface-container-low transition-colors"
            >
              <td class="px-gutter-sm py-2.5 font-mono text-mono-md text-light-on-surface truncate">{{ lr.code }}</td>
              <td class="px-gutter-sm py-2.5 font-title text-title-sm text-light-on-surface truncate" :title="lr.serviceName">
                {{ lr.serviceName }}
              </td>
              <td class="px-gutter-sm py-2.5 font-body text-body-sm text-light-on-surface-variant">
                {{ lr.estimatedHours }} hrs{{ lr.intervalKm ? ` • ${lr.intervalKm.toLocaleString()} km` : '' }}
              </td>
              <td class="px-gutter-sm py-2.5 text-right font-mono text-mono-md tabular-nums text-light-on-surface">
                <strong>S/ {{ lr.priceIgv.toFixed(2) }}</strong>
              </td>
              <td class="px-gutter-sm py-2.5 text-right font-mono text-mono-sm tabular-nums text-light-on-surface-variant">
                S/ {{ (lr.priceIgv / 1.18).toFixed(2) }}
              </td>
              <td class="px-gutter-sm py-2.5 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface font-label text-label-sm hover:bg-light-surface-container whitespace-nowrap"
                  @click="openEditLabor(lr)"
                >
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">edit</span>
                  <span>Editar</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Stitch Modal: Edit / Create Part Price -->
    <PartPriceModal
      :open="partModalOpen"
      :part="editingPart"
      :busy="saving"
      @close="partModalOpen = false"
      @save="handleSavePart"
    />

    <!-- Stitch Modal: Edit / Create Labor Rate -->
    <div
      v-if="laborModalOpen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-edit-labor-title"
      class="fixed inset-0 z-50 bg-light-on-surface/50 flex items-center justify-center p-gutter-lg"
    >
      <form
        class="w-full max-w-xl bg-light-surface-container-lowest border border-light-outline-variant rounded shadow-lg overflow-hidden"
        @submit.prevent="handleSaveLabor"
      >
        <header
          class="px-gutter-lg py-gutter-md border-b border-light-outline-variant bg-light-surface-container-low flex items-center justify-between"
        >
          <div class="flex items-center gap-gutter-sm">
            <span class="material-symbols-outlined text-[22px] text-light-primary" aria-hidden="true">build</span>
            <h3 id="modal-edit-labor-title" class="font-headline text-headline-md text-light-on-surface">
              {{ editingLabor ? 'Editar Tarifa de Mano de Obra' : 'Registrar Nueva Tarifa de Mano de Obra' }}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            class="w-7 h-7 rounded-xs text-light-on-surface-variant hover:bg-light-surface-container inline-flex items-center justify-center"
            @click="laborModalOpen = false"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        <div class="p-gutter-lg flex flex-col gap-gutter-md">
          <div class="grid grid-cols-2 gap-gutter-md">
            <label class="flex flex-col gap-gutter-xs">
              <span class="font-label text-label-md text-light-on-surface">Código *</span>
              <input
                v-model="laborCode"
                type="text"
                required
                maxlength="40"
                placeholder="Ej. MO-MANT-40K"
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md uppercase"
              />
            </label>

            <label class="flex flex-col gap-gutter-xs">
              <span class="font-label text-label-md text-light-on-surface">Tiempo Estimado (hrs) *</span>
              <input
                v-model.number="laborHours"
                type="number"
                step="0.25"
                min="0.10"
                required
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md"
              />
            </label>

            <label class="col-span-2 flex flex-col gap-gutter-xs">
              <span class="font-label text-label-md text-light-on-surface">Nombre del Servicio Toyota *</span>
              <input
                v-model="laborName"
                type="text"
                required
                maxlength="160"
                placeholder="Ej. Mantenimiento Preventivo 40,000 km Mayor"
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-md"
              />
            </label>
          </div>

          <div
            class="p-gutter-md rounded-sm bg-light-surface-container-low border border-light-outline-variant grid grid-cols-2 gap-gutter-md items-start"
          >
            <div class="flex flex-col gap-gutter-xs">
              <label for="labor-price" class="font-label text-label-md text-light-on-surface">
                Tarifa S/ (inc. IGV 18%) *
              </label>
              <input
                id="labor-price"
                v-model.number="laborPriceIgv"
                type="number"
                step="0.01"
                min="1.00"
                required
                class="h-9 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md tabular-nums"
              />
              <span class="font-mono text-mono-sm text-light-on-surface-variant">
                Base imponible: S/ {{ laborBaseSinIgv.toFixed(2) }} • IGV 18%: S/ {{ laborIgvAmount.toFixed(2) }}
              </span>
            </div>

            <label class="flex flex-col gap-gutter-xs">
              <span class="font-label text-label-md text-light-on-surface">Intervalo Km (opcional)</span>
              <input
                v-model.number="laborIntervalKm"
                type="number"
                min="0"
                step="5000"
                placeholder="Ej. 40000"
                class="h-9 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md tabular-nums"
              />
              <span class="font-body text-body-sm text-light-on-surface-variant">
                Opcional para servicios preventivos periódicos
              </span>
            </label>
          </div>
        </div>

        <footer
          class="px-gutter-lg py-gutter-sm border-t border-light-outline-variant bg-light-surface-container-low flex justify-end gap-gutter-sm"
        >
          <button
            type="button"
            class="h-9 px-gutter-md rounded-sm bg-light-surface-container-lowest border border-light-outline-variant font-label text-label-md"
            @click="laborModalOpen = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="h-9 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-md hover:opacity-90 disabled:opacity-50"
          >
            {{ saving ? 'Guardando...' : editingLabor ? 'Guardar Cambios' : 'Registrar Tarifa' }}
          </button>
        </footer>
      </form>
    </div>
  </main>
</template>
