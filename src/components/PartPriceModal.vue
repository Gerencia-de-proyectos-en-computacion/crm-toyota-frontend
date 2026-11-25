<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PartBrand, PartItem } from '@/types/crm'

export interface PartFormPayload {
  sku: string
  oemReferenceCode: string
  brand: PartBrand
  name: string
  category: string
  compatibleSummary: string
  salePriceIgv: number
  currentStock: number
  minStock: number
  compatibilities: null
}

const props = defineProps<{
  open: boolean
  part: PartItem | null
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: PartFormPayload, partId: number | null]
}>()

const brands: { value: PartBrand; label: string }[] = [
  { value: 'TOYOTA_OEM', label: 'TOYOTA OEM' },
  { value: 'DENSO', label: 'DENSO' },
  { value: 'AISIN', label: 'AISIN' },
  { value: 'ALTERNATIVO', label: 'ALTERNATIVO' },
]

const categories = ['Frenos', 'Filtros', 'Aceites', 'Encendido', 'Embrague']

const sku = ref('')
const oemReferenceCode = ref('')
const brand = ref<PartBrand>('TOYOTA_OEM')
const category = ref('Filtros')
const name = ref('')
const compatibleSummary = ref('')
const salePriceIgv = ref<number>(0)
const minStock = ref<number>(4)
const currentStock = ref<number>(0)

const isEditing = computed(() => props.part !== null)

const baseSinIgv = computed(() => {
  const val = Number(salePriceIgv.value) || 0
  return val / 1.18
})

const igvAmount = computed(() => {
  const val = Number(salePriceIgv.value) || 0
  return val - baseSinIgv.value
})

watch(
  () => [props.open, props.part] as const,
  ([isOpen, currentPart]) => {
    if (!isOpen) return
    if (currentPart) {
      sku.value = currentPart.sku
      oemReferenceCode.value = currentPart.oemReferenceCode
      brand.value = currentPart.brand
      category.value = categories.includes(currentPart.category) ? currentPart.category : 'Filtros'
      name.value = currentPart.name
      compatibleSummary.value = currentPart.compatibleSummary
      salePriceIgv.value = Number(currentPart.salePriceIgv.toFixed(2))
      minStock.value = currentPart.minStock
      currentStock.value = currentPart.currentStock
    } else {
      sku.value = ''
      oemReferenceCode.value = ''
      brand.value = 'TOYOTA_OEM'
      category.value = 'Filtros'
      name.value = ''
      compatibleSummary.value = 'Yaris, Corolla, RAV4'
      salePriceIgv.value = 50
      minStock.value = 4
      currentStock.value = 0
    }
  },
  { immediate: true },
)

function handleSubmit() {
  emit(
    'save',
    {
      sku: sku.value.trim().toUpperCase(),
      oemReferenceCode: oemReferenceCode.value.trim().toUpperCase(),
      brand: brand.value,
      name: name.value.trim(),
      category: category.value,
      compatibleSummary: compatibleSummary.value.trim(),
      salePriceIgv: Number(salePriceIgv.value),
      currentStock: isEditing.value && props.part ? props.part.currentStock : Math.max(0, Number(currentStock.value) || 0),
      minStock: Math.max(0, Number(minStock.value) || 0),
      compatibilities: null,
    },
    props.part ? props.part.id : null,
  )
}
</script>

<template>
  <div
    v-if="open"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-edit-part-title"
    class="fixed inset-0 z-50 bg-light-on-surface/50 flex items-center justify-center p-gutter-lg"
  >
    <form
      class="w-full max-w-2xl bg-light-surface-container-lowest border border-light-outline-variant rounded shadow-lg overflow-hidden"
      @submit.prevent="handleSubmit"
    >
      <header
        class="px-gutter-lg py-gutter-md border-b border-light-outline-variant bg-light-surface-container-low flex items-center justify-between"
      >
        <div class="flex items-center gap-gutter-sm">
          <span class="material-symbols-outlined text-[22px] text-light-primary" aria-hidden="true">edit_note</span>
          <h3 id="modal-edit-part-title" class="font-headline text-headline-md text-light-on-surface">
            {{ isEditing ? 'Editar Precio y Datos del Repuesto' : 'Registrar Nuevo Repuesto en Catálogo' }}
          </h3>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          class="w-7 h-7 rounded-xs text-light-on-surface-variant hover:bg-light-surface-container inline-flex items-center justify-center"
          @click="emit('close')"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </header>

      <div class="p-gutter-lg flex flex-col gap-gutter-md">
        <!-- Stitch 2-Column Grid -->
        <div class="grid grid-cols-2 gap-gutter-md">
          <label class="flex flex-col gap-gutter-xs">
            <span class="font-label text-label-md text-light-on-surface">SKU *</span>
            <input
              v-model="sku"
              type="text"
              required
              maxlength="40"
              placeholder="Ej. TOY-PAD-523"
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md uppercase text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
            />
          </label>

          <label class="flex flex-col gap-gutter-xs">
            <span class="font-label text-label-md text-light-on-surface">
              Código OEM Común (agrupar equivalentes) *
            </span>
            <input
              v-model="oemReferenceCode"
              type="text"
              required
              maxlength="40"
              placeholder="Ej. 04465-0D150"
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md uppercase text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
            />
          </label>

          <label class="flex flex-col gap-gutter-xs">
            <span class="font-label text-label-md text-light-on-surface">Marca *</span>
            <select
              v-model="brand"
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-md text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
            >
              <option v-for="b in brands" :key="b.value" :value="b.value">{{ b.label }}</option>
            </select>
          </label>

          <label class="flex flex-col gap-gutter-xs">
            <span class="font-label text-label-md text-light-on-surface">Categoría *</span>
            <select
              v-model="category"
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-md text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
            >
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </label>

          <label class="col-span-2 flex flex-col gap-gutter-xs">
            <span class="font-label text-label-md text-light-on-surface">Nombre del Repuesto *</span>
            <input
              v-model="name"
              type="text"
              required
              maxlength="160"
              placeholder="Ej. Pastillas de Freno Delanteras OEM"
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-md text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
            />
          </label>

          <label class="col-span-2 flex flex-col gap-gutter-xs">
            <span class="font-label text-label-md text-light-on-surface">Modelos Toyota Compatibles *</span>
            <input
              v-model="compatibleSummary"
              type="text"
              required
              maxlength="140"
              placeholder="Ej. Yaris (14-24), Corolla, RAV4"
              class="h-8 px-2.5 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-md text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
            />
          </label>
        </div>

        <!-- Highlighted Sale Price + IGV Preview + Stock Threshold Block (Stitch 1:1) -->
        <div
          class="p-gutter-md rounded-sm bg-light-surface-container-low border border-light-outline-variant grid grid-cols-2 gap-gutter-md items-start"
        >
          <div class="flex flex-col gap-gutter-xs">
            <label for="part-sale-price" class="font-label text-label-md text-light-on-surface">
              Precio de Venta S/ (inc. IGV 18%) *
            </label>
            <input
              id="part-sale-price"
              v-model.number="salePriceIgv"
              type="number"
              step="0.01"
              min="0.01"
              required
              class="h-9 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md tabular-nums text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
            />
            <span data-testid="part-tax-preview" class="font-mono text-mono-sm text-light-on-surface-variant">
              Base imponible: S/ {{ baseSinIgv.toFixed(2) }} • IGV 18%: S/ {{ igvAmount.toFixed(2) }}
            </span>
          </div>

          <div class="flex flex-col gap-gutter-xs">
            <div class="grid gap-gutter-sm" :class="isEditing ? 'grid-cols-1' : 'grid-cols-2'">
              <label class="flex flex-col gap-gutter-xs">
                <span class="font-label text-label-md text-light-on-surface">Stock Mínimo de Alerta *</span>
                <input
                  id="part-min-stock"
                  v-model.number="minStock"
                  type="number"
                  min="0"
                  required
                  class="h-9 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md tabular-nums text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
                />
              </label>

              <label v-if="!isEditing" class="flex flex-col gap-gutter-xs">
                <span class="font-label text-label-md text-light-on-surface">Stock Inicial</span>
                <input
                  id="part-initial-stock"
                  v-model.number="currentStock"
                  type="number"
                  min="0"
                  required
                  class="h-9 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-mono text-mono-md tabular-nums text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
                />
              </label>
            </div>
            <span class="font-body text-body-sm text-light-on-surface-variant">
              {{
                isEditing
                  ? `Stock físico actual: ${currentStock} u. (los ingresos se registran vía Reposición / Kardex)`
                  : 'Activa semáforo amarillo/rojo al alcanzar este umbral'
              }}
            </span>
          </div>
        </div>
      </div>

      <footer
        class="px-gutter-lg py-gutter-sm border-t border-light-outline-variant bg-light-surface-container-low flex justify-end gap-gutter-sm"
      >
        <button
          type="button"
          class="h-9 px-gutter-md rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface font-label text-label-md hover:bg-light-surface-container"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="busy"
          class="h-9 px-gutter-lg rounded-sm bg-light-primary text-light-on-primary font-label text-label-md hover:opacity-90 disabled:opacity-50"
        >
          {{ busy ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Repuesto' }}
        </button>
      </footer>
    </form>
  </div>
</template>
