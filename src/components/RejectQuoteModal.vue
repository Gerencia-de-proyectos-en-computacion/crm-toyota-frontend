<script setup lang="ts">
import { ref } from 'vue'
import type { QuoteStatus, RejectionReason } from '@/types/crm'

const props = defineProps<{
  open: boolean
  quoteNumber: string
  customerName: string
  currentStatus: QuoteStatus
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [reason: RejectionReason, notes: string]
}>()

const selectedReason = ref<RejectionReason>('FALTA_STOCK')
const notes = ref('')

const reasons: { value: RejectionReason; label: string }[] = [
  { value: 'FALTA_STOCK', label: 'Falta de Stock' },
  { value: 'PRECIO', label: 'Precio' },
  { value: 'TIEMPO_ESPERA', label: 'Tiempo de Espera' },
  { value: 'OTRO', label: 'Otro' },
]

function submit() {
  emit('confirm', selectedReason.value, notes.value)
}
</script>

<template>
  <div
    v-if="props.open"
    role="dialog"
    aria-modal="true"
    class="fixed inset-0 z-50 bg-light-on-surface/50 flex items-center justify-center p-gutter-lg"
  >
    <div
      class="w-full max-w-md bg-light-surface-container-lowest border border-light-outline-variant rounded shadow-lg overflow-hidden"
    >
      <header
        class="px-gutter-lg py-gutter-md border-b border-light-outline-variant bg-light-surface-container-low flex items-center justify-between"
      >
        <div>
          <h2 class="font-headline text-headline-md text-light-on-surface">
            {{ props.currentStatus === 'APROBADA' ? 'Anular Aprobación y Reintegrar Stock' : 'Rechazar Cotización' }}
          </h2>
          <p class="font-mono text-mono-sm text-light-on-surface-variant">
            {{ props.quoteNumber }} • {{ props.customerName }}
          </p>
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
        <div
          v-if="props.currentStatus === 'APROBADA'"
          class="p-gutter-sm rounded-sm bg-warning-container text-on-warning-container font-body text-body-sm"
        >
          Esta cotización ya descontó stock. Al confirmar el rechazo, las unidades se reintegrarán atómicamente al
          almacén y quedará registrado en el kardex.
        </div>

        <div>
          <span class="block font-label text-label-md text-light-on-surface mb-gutter-sm">
            Motivo de Rechazo <span class="text-light-primary">*</span>
          </span>
          <div class="grid grid-cols-2 gap-gutter-sm">
            <label
              v-for="opt in reasons"
              :key="opt.value"
              class="p-gutter-sm rounded-sm flex items-center gap-gutter-xs cursor-pointer transition-colors"
              :class="
                selectedReason === opt.value
                  ? 'border-2 border-light-primary bg-light-primary-container/30'
                  : 'border border-light-outline-variant bg-light-surface-container-lowest'
              "
            >
              <input
                v-model="selectedReason"
                type="radio"
                name="reject-reason"
                :value="opt.value"
                class="text-light-primary focus:ring-light-primary"
              />
              <span class="font-label text-label-md text-light-on-surface">{{ opt.label }}</span>
            </label>
          </div>
        </div>

        <label class="flex flex-col gap-gutter-xs">
          <span class="font-label text-label-md text-light-on-surface">Observación adicional (opcional)</span>
          <textarea
            v-model="notes"
            rows="3"
            placeholder="Ej. Cliente requiere entrega inmediata o cotizará la próxima semana..."
            class="w-full p-2 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-body text-body-sm text-light-on-surface focus:border-light-primary focus:ring-1 focus:ring-light-primary"
          ></textarea>
        </label>
      </div>

      <footer
        class="px-gutter-lg py-gutter-sm border-t border-light-outline-variant bg-light-surface-container-low flex justify-end gap-gutter-sm"
      >
        <button
          type="button"
          class="h-8 px-gutter-md rounded-sm bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface font-label text-label-md hover:bg-light-surface-container"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="props.busy"
          class="h-8 px-gutter-md rounded-sm bg-light-primary text-light-on-primary font-label text-label-md hover:opacity-90 disabled:opacity-50"
          @click="submit"
        >
          Confirmar Rechazo
        </button>
      </footer>
    </div>
  </div>
</template>
