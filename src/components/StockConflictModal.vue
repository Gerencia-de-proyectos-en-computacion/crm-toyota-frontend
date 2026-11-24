<script setup lang="ts">
import type { StockConflictDetail } from '@/types/crm'

defineProps<{
  open: boolean
  quoteNumber: string
  conflicts: StockConflictDetail[]
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  substitute: [missingPartId: number, replacementPartId: number]
}>()
</script>

<template>
  <div
    v-if="open"
    role="dialog"
    aria-modal="true"
    class="fixed inset-0 z-50 bg-light-on-surface/50 flex items-center justify-center p-gutter-lg"
  >
    <div
      class="w-full max-w-xl bg-light-surface-container-lowest border border-light-outline-variant rounded shadow-lg overflow-hidden"
    >
      <header
        class="px-gutter-lg py-gutter-md bg-light-error-container border-b border-light-outline-variant flex items-center justify-between gap-gutter-sm"
      >
        <div class="flex items-center gap-gutter-sm">
          <span class="material-symbols-outlined text-[24px] text-light-error">error</span>
          <div>
            <span class="font-mono text-mono-sm text-light-on-error-container uppercase">
              Error 409 • Conflicto de Stock en Almacén
            </span>
            <h2 class="font-headline text-headline-md text-light-on-error-container">
              No se puede aprobar: Stock insuficiente
            </h2>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          class="w-7 h-7 rounded-xs text-light-on-error-container hover:bg-light-surface-container-lowest/40 inline-flex items-center justify-center"
          @click="emit('close')"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </header>

      <div class="p-gutter-lg flex flex-col gap-gutter-md max-h-[75vh] overflow-y-auto pos-scroll">
        <p class="font-body text-body-md text-light-on-surface-variant">
          La proforma <span class="font-mono text-mono-md text-light-on-surface">{{ quoteNumber }}</span> permanece en
          estado <strong>PENDIENTE</strong> porque uno o más repuestos no cuentan con stock físico suficiente:
        </p>

        <div v-for="c in conflicts" :key="c.partId" class="flex flex-col gap-gutter-sm">
          <div
            class="p-gutter-md rounded-sm bg-light-surface-container-low border border-light-outline-variant flex items-center justify-between gap-gutter-sm"
          >
            <div>
              <div class="font-title text-title-sm text-light-on-surface">
                {{ c.partName }} ({{ c.brand }})
              </div>
              <div class="font-mono text-mono-sm text-light-on-surface-variant">
                OEM: {{ c.oemReferenceCode }} • SKU: {{ c.sku }}
              </div>
            </div>
            <div class="flex items-center gap-gutter-sm shrink-0">
              <span class="px-2.5 py-1 rounded-xs bg-light-surface-container text-light-on-surface font-mono text-mono-sm">
                Solicitado: {{ c.requestedQty }}
              </span>
              <span
                class="px-2.5 py-1 rounded-xs bg-light-error-container text-light-on-error-container font-mono text-mono-sm"
              >
                Disponible: {{ c.availableQty }}
              </span>
            </div>
          </div>

          <div
            class="p-gutter-md rounded-sm bg-info-container border border-light-outline-variant flex flex-col gap-gutter-sm"
          >
            <div class="flex items-center gap-gutter-xs text-on-info-container">
              <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
              <span class="font-title text-title-sm">Equivalentes compatibles con stock inmediato</span>
            </div>

            <div v-if="c.compatibleEquivalents.length === 0" class="font-body text-body-sm text-on-info-container">
              No hay equivalentes con stock inmediato para este código OEM. Solicite reposición a Almacén.
            </div>

            <div v-else class="flex flex-col gap-gutter-xs">
              <div
                v-for="eq in c.compatibleEquivalents"
                :key="eq.partId"
                class="p-gutter-sm rounded-xs bg-light-surface-container-lowest border border-light-outline-variant flex items-center justify-between gap-gutter-sm"
              >
                <div>
                  <div class="flex items-center gap-gutter-xs">
                    <span class="font-title text-title-sm text-light-on-surface">
                      {{ eq.name }} ({{ eq.sku }})
                    </span>
                    <span
                      class="px-1.5 py-0.5 rounded-xs bg-light-secondary-container text-light-on-secondary-container font-label text-label-sm uppercase"
                    >
                      {{ eq.brand }}
                    </span>
                  </div>
                  <div class="font-mono text-mono-sm text-light-on-surface-variant">
                    S/ {{ eq.salePriceIgv.toFixed(2) }} (inc. IGV) • Stock: {{ eq.currentStock }} u.
                  </div>
                </div>
                <button
                  type="button"
                  :disabled="busy"
                  class="h-8 px-gutter-md rounded-sm bg-light-primary text-light-on-primary font-label text-label-sm hover:opacity-90 shrink-0 disabled:opacity-50"
                  @click="emit('substitute', c.partId, eq.partId)"
                >
                  Sustituir y Aprobar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer
        class="px-gutter-lg py-gutter-sm border-t border-light-outline-variant bg-light-surface-container-low flex justify-end gap-gutter-sm"
      >
        <button
          type="button"
          class="h-8 px-gutter-md rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface font-label text-label-md hover:bg-light-surface-container"
          @click="emit('close')"
        >
          Cerrar y Mantener Pendiente
        </button>
      </footer>
    </div>
  </div>
</template>
