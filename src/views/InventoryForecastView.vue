<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type {
  ForecastDashboardResponse,
  PartItem,
  RestockAlertRow,
  StockAlertLevel,
} from '@/types/crm'
import { api, extractErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()

const dashboard = ref<ForecastDashboardResponse | null>(null)
const catalogOnly = ref<PartItem[]>([])
const activeFilter = ref<'ALL' | StockAlertLevel>('ALL')
const searchQuery = ref('')
const recalculating = ref(false)

const restockModalOpen = ref(false)
const restockTarget = ref<{ partId: number; sku: string; partName: string } | null>(null)
const restockQty = ref(20)
const supplierName = ref('Importaciones Nipón Repuestos SAC')
const referenceDoc = ref('FAC-F001-00984')
const unitCost = ref(95)
const savingRestock = ref(false)

const isWarehouseOrAdmin = computed(() => auth.role === 'ADMIN' || auth.role === 'ALMACEN')

const filteredAlerts = computed(() => {
  if (!dashboard.value) return []
  const q = searchQuery.value.trim().toLowerCase()
  return dashboard.value.alerts.filter((r) => {
    const statusOk = activeFilter.value === 'ALL' || r.alertLevel === activeFilter.value
    const searchOk =
      !q ||
      r.sku.toLowerCase().includes(q) ||
      r.oemReferenceCode.toLowerCase().includes(q) ||
      r.partName.toLowerCase().includes(q) ||
      r.compatibleModels.toLowerCase().includes(q)
    return statusOk && searchOk
  })
})

async function loadData() {
  try {
    if (isWarehouseOrAdmin.value) {
      const { data } = await api.get<ForecastDashboardResponse>('/api/v1/forecasts/dashboard')
      dashboard.value = data
    } else {
      const { data } = await api.get<PartItem[]>('/api/v1/parts')
      catalogOnly.value = data
    }
  } catch (err) {
    toast.show(extractErrorMessage(err, 'Error consultando inventario y pronóstico'), 'error')
  }
}

async function triggerRecalculateMl() {
  recalculating.value = true
  try {
    const { data } = await api.post<ForecastDashboardResponse>('/api/v1/forecasts/recalculate')
    dashboard.value = data
    toast.show(
      `Random Forest Batch ejecutado (${data.modelHealth.executionSource} • R²: ${data.modelHealth.r2})`,
    )
  } catch (err) {
    toast.show(extractErrorMessage(err, 'No se pudo recalcular la demanda'), 'error')
  } finally {
    recalculating.value = false
  }
}

function openRestockModal(row: RestockAlertRow) {
  restockTarget.value = { partId: row.partId, sku: row.sku, partName: row.partName }
  restockQty.value = row.suggestedOrderQty > 0 ? row.suggestedOrderQty : 15
  restockModalOpen.value = true
}

async function submitRestock() {
  if (!restockTarget.value) return
  savingRestock.value = true
  try {
    await api.post('/api/v1/inventory/replenishments', {
      partId: restockTarget.value.partId,
      quantityAdded: restockQty.value,
      supplierName: supplierName.value.trim(),
      referenceDoc: referenceDoc.value.trim(),
      unitCost: unitCost.value,
    })
    restockModalOpen.value = false
    toast.show(`Stock repuesto (+${restockQty.value} u. en ${restockTarget.value.sku})`)
    await loadData()
  } catch (err) {
    toast.show(extractErrorMessage(err, 'Error registrando ingreso de almacén'), 'error')
  } finally {
    savingRestock.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <main class="p-gutter-md flex flex-col gap-gutter-md">
    <!-- ADMIN / ALMACEN: Full Stitch ML Forecast Dashboard -->
    <template v-if="isWarehouseOrAdmin && dashboard">
      <section
        class="bg-light-surface-container-lowest border border-light-outline-variant rounded px-gutter-lg py-gutter-sm flex items-center justify-between gap-gutter-md flex-wrap"
      >
        <div class="flex items-center gap-gutter-md flex-wrap min-w-0">
          <div class="flex items-center gap-gutter-sm">
            <span class="material-symbols-outlined text-[22px] text-light-primary">query_stats</span>
            <div>
              <h2 class="font-headline text-headline-lg text-light-on-surface">
                Pronóstico de Demanda (Random Forest Batch)
              </h2>
              <p class="font-body text-body-sm text-light-on-surface-variant">
                Versión: {{ dashboard.modelHealth.modelVersion }} • Horizonte:
                {{ dashboard.modelHealth.horizonLabel }} • Fuente: {{ dashboard.modelHealth.executionSource }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-gutter-xs flex-wrap">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full bg-success-container text-on-success-container font-mono text-mono-sm"
            >
              R²: {{ dashboard.modelHealth.r2 }}
            </span>
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full bg-light-surface-container-low border border-light-outline-variant font-mono text-mono-sm"
            >
              WAPE: {{ dashboard.modelHealth.wapePercent }}%
            </span>
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full bg-light-surface-container-low border border-light-outline-variant font-mono text-mono-sm"
            >
              MAPE (&gt;0): {{ dashboard.modelHealth.mapeNonzeroPercent }}%
            </span>
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full bg-light-surface-container-low border border-light-outline-variant font-mono text-mono-sm"
            >
              ADI: {{ dashboard.modelHealth.adi }}
            </span>
          </div>
        </div>

        <button
          v-if="auth.role === 'ADMIN'"
          type="button"
          :disabled="recalculating"
          class="inline-flex items-center gap-gutter-xs h-9 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-lg hover:opacity-90 disabled:opacity-50"
          @click="triggerRecalculateMl"
        >
          <span class="material-symbols-outlined text-[18px]">autorenew</span>
          <span>{{ recalculating ? 'Recalculando Lote...' : 'Recalcular Demanda ML' }}</span>
        </button>
      </section>

      <!-- 4 Compact KPI Cards in One Row (Stitch 1:1) -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter-md items-stretch">
        <article
          class="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-md flex flex-col justify-between gap-gutter-xs"
        >
          <span class="font-label text-label-md text-light-on-surface-variant">
            Repuestos en Riesgo Crítico (Rojo)
          </span>
          <div class="flex items-baseline justify-between gap-gutter-sm">
            <span class="font-display text-display-lg tabular-nums">{{ dashboard.criticalCount }} SKUs</span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-light-error-container text-light-on-error-container font-label text-label-sm"
            >
              CRÍTICO
            </span>
          </div>
        </article>

        <article
          class="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-md flex flex-col justify-between gap-gutter-xs"
        >
          <span class="font-label text-label-md text-light-on-surface-variant">
            Alertas Preventivas (Amarillo)
          </span>
          <div class="flex items-baseline justify-between gap-gutter-sm">
            <span class="font-display text-display-lg tabular-nums">{{ dashboard.warningCount }} SKUs</span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-container text-on-warning-container font-label text-label-sm"
            >
              ALERTA
            </span>
          </div>
        </article>

        <article
          class="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-md flex flex-col justify-between gap-gutter-xs"
        >
          <span class="font-label text-label-md text-light-on-surface-variant">
            Ventas Perdidas por Falta de Stock
          </span>
          <div class="flex items-baseline justify-between gap-gutter-sm">
            <span class="font-display text-display-lg tabular-nums text-light-primary">
              S/ {{ dashboard.lostSales.lostAmountLackOfStockSoles.toFixed(2) }}
            </span>
            <span class="font-body text-body-sm text-light-on-surface-variant">
              {{ dashboard.lostSales.rejectedQuotesLackOfStockCount }} proforma(s)
            </span>
          </div>
        </article>

        <article
          class="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-md flex flex-col justify-between gap-gutter-xs"
        >
          <span class="font-label text-label-md text-light-on-surface-variant">
            Tasa de Conversión Comercial
          </span>
          <div class="flex items-baseline justify-between gap-gutter-sm">
            <span class="font-display text-display-lg tabular-nums">
              {{ dashboard.conversion.conversionRatePercent }}%
            </span>
            <span class="font-body text-body-sm text-light-on-surface-variant">
              {{ dashboard.conversion.approvedOrClosedCount }} /
              {{ dashboard.conversion.totalDecidedOrActiveCount }} cotiz.
            </span>
          </div>
        </article>
      </section>

      <!-- Main 9-Column Compact Restock Table (Zero Horizontal Scroll at 1366px) -->
      <section
        class="bg-light-surface-container-lowest border border-light-outline-variant rounded flex flex-col overflow-hidden"
      >
        <div
          class="px-gutter-md py-gutter-sm border-b border-light-outline-variant bg-light-surface-container-low flex items-center justify-between gap-gutter-md flex-wrap"
        >
          <h3 class="font-title text-title-sm text-light-on-surface">
            Alertas de Reabastecimiento por Repuesto • Prioridad de Quiebre
          </h3>

          <div class="flex items-center gap-gutter-sm flex-wrap">
            <div class="flex items-center gap-gutter-xs">
              <button
                v-for="lv in (['ALL', 'CRITICO', 'ALERTA', 'NORMAL'] as const)"
                :key="lv"
                type="button"
                class="px-2.5 py-1 rounded-full font-label text-label-sm"
                :class="
                  activeFilter === lv
                    ? 'bg-light-secondary text-light-on-secondary'
                    : 'bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface-variant'
                "
                @click="activeFilter = lv"
              >
                {{ lv === 'ALL' ? 'Todos' : lv }}
              </button>
            </div>

            <input
              v-model="searchQuery"
              type="search"
              placeholder="Filtrar SKU, OEM o modelo..."
              class="h-7 w-56 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-sm"
            />
          </div>
        </div>

        <div class="pos-scroll overflow-y-auto overflow-x-hidden max-h-[395px]">
          <table class="w-full border-collapse text-left table-fixed">
            <thead class="sticky top-0 z-10 bg-light-surface-container-low border-b border-light-outline-variant">
              <tr>
                <th class="w-[11%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                  SKU / OEM
                </th>
                <th class="w-[19%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                  Repuesto & Marca
                </th>
                <th class="w-[14%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase">
                  Modelos Toyota
                </th>
                <th
                  class="w-[7%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                >
                  Stock
                </th>
                <th
                  class="w-[10%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                >
                  Demanda ML
                </th>
                <th
                  class="w-[7%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                >
                  ROP
                </th>
                <th
                  class="w-[9%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                >
                  Compra Sug.
                </th>
                <th
                  class="w-[9%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-center"
                >
                  Semáforo
                </th>
                <th
                  class="w-[14%] px-gutter-sm py-2 font-label text-label-sm text-light-on-surface-variant uppercase text-right"
                >
                  Acción
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-light-outline-variant">
              <tr
                v-for="row in filteredAlerts"
                :key="row.partId"
                class="hover:bg-light-surface-container-low transition-colors"
              >
                <td class="px-gutter-sm py-2">
                  <div class="font-mono text-mono-md truncate">{{ row.sku }}</div>
                  <div class="font-mono text-mono-sm text-light-on-surface-variant truncate">
                    {{ row.oemReferenceCode }}
                  </div>
                </td>
                <td class="px-gutter-sm py-2">
                  <div class="font-title text-title-sm truncate" :title="row.partName">{{ row.partName }}</div>
                  <span
                    class="inline-flex px-1.5 py-0.5 rounded-xs bg-light-secondary-container text-light-on-secondary-container font-label text-label-sm uppercase"
                  >
                    {{ row.brand.replace('_', ' ') }}
                  </span>
                </td>
                <td
                  class="px-gutter-sm py-2 font-body text-body-sm text-light-on-surface-variant truncate"
                  :title="row.compatibleModels"
                >
                  {{ row.compatibleModels }}
                </td>
                <td
                  class="px-gutter-sm py-2 text-right font-mono text-mono-md tabular-nums"
                  :class="row.alertLevel === 'CRITICO' ? 'text-light-error font-bold' : ''"
                >
                  {{ row.currentStock }} u.
                </td>
                <td class="px-gutter-sm py-2 text-right font-mono text-mono-md tabular-nums">
                  {{ row.predictedDemand }} u.
                </td>
                <td class="px-gutter-sm py-2 text-right font-mono text-mono-md tabular-nums text-light-on-surface-variant">
                  {{ row.reorderPoint }} u.
                </td>
                <td class="px-gutter-sm py-2 text-right font-title text-title-sm tabular-nums text-light-primary">
                  +{{ row.suggestedOrderQty }} u.
                </td>
                <td class="px-gutter-sm py-2 text-center">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full font-label text-label-sm"
                    :class="{
                      'bg-light-error-container text-light-on-error-container': row.alertLevel === 'CRITICO',
                      'bg-warning-container text-on-warning-container': row.alertLevel === 'ALERTA',
                      'bg-success-container text-on-success-container': row.alertLevel === 'NORMAL',
                    }"
                  >
                    {{ row.alertLevel }}
                  </span>
                </td>
                <td class="px-gutter-sm py-2 text-right">
                  <button
                    type="button"
                    class="h-7 px-2 rounded-sm font-label text-label-sm whitespace-nowrap"
                    :class="
                      row.alertLevel === 'CRITICO'
                        ? 'bg-light-primary text-light-on-primary hover:opacity-90'
                        : 'bg-light-surface-container-lowest border border-light-outline-variant hover:bg-light-surface-container'
                    "
                    @click="openRestockModal(row)"
                  >
                    + Reponer Stock
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- RECEPCIONISTA Read-Only Catalog View -->
    <section
      v-else
      class="bg-light-surface-container-lowest border border-light-outline-variant rounded p-gutter-lg"
    >
      <h2 class="font-headline text-headline-lg mb-gutter-sm">Consulta Rápida de Stock en Almacén</h2>
      <div class="pos-scroll overflow-y-auto max-h-[540px]">
        <table class="w-full border-collapse text-left">
          <thead class="bg-light-surface-container-low border-b border-light-outline-variant">
            <tr>
              <th class="p-2 font-label text-label-sm uppercase">SKU / OEM</th>
              <th class="p-2 font-label text-label-sm uppercase">Repuesto</th>
              <th class="p-2 font-label text-label-sm uppercase">Compatibilidad</th>
              <th class="p-2 font-label text-label-sm uppercase text-right">Stock</th>
              <th class="p-2 font-label text-label-sm uppercase text-right">Precio (S/)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-light-outline-variant">
            <tr v-for="p in catalogOnly" :key="p.id">
              <td class="p-2 font-mono text-mono-md">{{ p.sku }} • {{ p.oemReferenceCode }}</td>
              <td class="p-2 font-title text-title-sm">{{ p.name }} ({{ p.brand }})</td>
              <td class="p-2 font-body text-body-sm text-light-on-surface-variant">{{ p.compatibleSummary }}</td>
              <td class="p-2 text-right font-mono text-mono-md">{{ p.currentStock }} u.</td>
              <td class="p-2 text-right font-mono text-mono-md">S/ {{ p.salePriceIgv.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Fast Stock Replenishment Modal (EXT04) -->
    <div
      v-if="restockModalOpen && restockTarget"
      role="dialog"
      aria-modal="true"
      class="fixed inset-0 z-50 bg-light-on-surface/50 flex items-center justify-center p-gutter-lg"
    >
      <form
        class="w-full max-w-md bg-light-surface-container-lowest border border-light-outline-variant rounded shadow-lg overflow-hidden"
        @submit.prevent="submitRestock"
      >
        <header
          class="px-gutter-lg py-gutter-md bg-light-surface-container-low border-b border-light-outline-variant flex items-center justify-between"
        >
          <div>
            <h3 class="font-headline text-headline-md">Ingreso Rápido de Compra / Reposición</h3>
            <p class="font-mono text-mono-sm text-light-on-surface-variant">
              {{ restockTarget.sku }} • {{ restockTarget.partName }}
            </p>
          </div>
          <button type="button" class="w-7 h-7" @click="restockModalOpen = false">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        <div class="p-gutter-lg flex flex-col gap-gutter-sm">
          <div class="grid grid-cols-2 gap-gutter-sm">
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Cantidad Recibida *</span>
              <input
                v-model.number="restockQty"
                type="number"
                min="1"
                required
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-md"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-label text-label-sm">Costo Unit. S/ (opc.)</span>
              <input
                v-model.number="unitCost"
                type="number"
                step="0.01"
                min="0.01"
                class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-md"
              />
            </label>
          </div>

          <label class="flex flex-col gap-1">
            <span class="font-label text-label-sm">Proveedor *</span>
            <input
              v-model="supplierName"
              required
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-body text-body-sm"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-label text-label-sm">Guía Remisión / Factura Compra *</span>
            <input
              v-model="referenceDoc"
              required
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant font-mono text-mono-md uppercase"
            />
          </label>
        </div>

        <footer
          class="px-gutter-lg py-gutter-sm border-t border-light-outline-variant bg-light-surface-container-low flex justify-end gap-gutter-sm"
        >
          <button
            type="button"
            class="h-8 px-gutter-md rounded-sm border border-light-outline-variant font-label text-label-md"
            @click="restockModalOpen = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="savingRestock"
            class="h-8 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-md"
          >
            {{ savingRestock ? 'Registrando...' : 'Confirmar Ingreso a Almacén' }}
          </button>
        </footer>
      </form>
    </div>
  </main>
</template>
