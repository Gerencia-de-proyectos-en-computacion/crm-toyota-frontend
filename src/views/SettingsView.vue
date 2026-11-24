<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { extractErrorMessage } from '@/services/api'
import { useWorkshopConfigStore } from '@/stores/workshopConfig'
import { useToastStore } from '@/stores/toast'

const workshopConfig = useWorkshopConfigStore()
const toast = useToastStore()

const businessName = ref('')
const slogan = ref('')
const ruc = ref('')
const address = ref('')
const phone = ref('')
const email = ref('')
const quoteValidityDays = ref(7)
const saving = ref(false)

function syncFromStore() {
  const s = workshopConfig.settings
  businessName.value = s.businessName
  slogan.value = s.slogan
  ruc.value = s.ruc
  address.value = s.address
  phone.value = s.phone
  email.value = s.email ?? ''
  quoteValidityDays.value = s.quoteValidityDays
}

function resetNeutralPlaceholder() {
  businessName.value = '[Nombre del Taller Automotriz]'
  slogan.value = 'Servicio Técnico y Repuestos Especializados Toyota'
}

async function saveSettings() {
  saving.value = true
  try {
    await workshopConfig.updateSettings({
      businessName: businessName.value,
      slogan: slogan.value,
      ruc: ruc.value,
      address: address.value,
      phone: phone.value,
      email: email.value || null,
      quoteValidityDays: quoteValidityDays.value,
    })
    toast.show('Configuración de Marca Blanca actualizada para UI y PDF')
  } catch (err) {
    toast.show(extractErrorMessage(err, 'No se pudo actualizar la configuración'), 'error')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await workshopConfig.fetchSettings()
  syncFromStore()
})
</script>

<template>
  <main class="p-gutter-md flex justify-center">
    <form
      class="w-full max-w-2xl bg-light-surface-container-lowest border border-light-outline-variant rounded overflow-hidden"
      @submit.prevent="saveSettings"
    >
      <header
        class="px-gutter-lg py-gutter-md bg-light-surface-container-low border-b border-light-outline-variant flex items-center justify-between"
      >
        <div>
          <h2 class="font-headline text-headline-lg text-light-on-surface">
            Identidad Comercial / Marca Blanca (Demos Multi-Taller)
          </h2>
          <p class="font-body text-body-sm text-light-on-surface-variant">
            Modifica en vivo el nombre en la barra superior, mensajes de WhatsApp y membrete del PDF OpenPDF
          </p>
        </div>

        <button
          type="button"
          class="h-8 px-3 rounded-sm border border-light-outline-variant bg-light-surface-container-lowest font-label text-label-sm hover:bg-light-surface-container"
          @click="resetNeutralPlaceholder"
        >
          Restaurar Placeholder Neutro
        </button>
      </header>

      <div class="p-gutter-lg grid grid-cols-1 md:grid-cols-2 gap-gutter-md">
        <label class="md:col-span-2 flex flex-col gap-1">
          <span class="font-label text-label-md">Nombre Comercial del Taller *</span>
          <input
            v-model="businessName"
            required
            class="h-9 px-3 rounded-sm border border-light-outline-variant font-headline text-headline-md"
          />
        </label>

        <label class="md:col-span-2 flex flex-col gap-1">
          <span class="font-label text-label-md">Especialidad / Lema Comercial *</span>
          <input
            v-model="slogan"
            required
            class="h-9 px-3 rounded-sm border border-light-outline-variant font-body text-body-md"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-label text-label-md">RUC (11 dígitos) *</span>
          <input
            v-model="ruc"
            required
            pattern="\d{11}"
            class="h-9 px-3 rounded-sm border border-light-outline-variant font-mono text-mono-md"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-label text-label-md">Teléfono / WhatsApp Taller *</span>
          <input
            v-model="phone"
            required
            class="h-9 px-3 rounded-sm border border-light-outline-variant font-mono text-mono-md"
          />
        </label>

        <label class="md:col-span-2 flex flex-col gap-1">
          <span class="font-label text-label-md">Dirección Fiscal / Sede *</span>
          <input
            v-model="address"
            required
            class="h-9 px-3 rounded-sm border border-light-outline-variant font-body text-body-md"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-label text-label-md">Correo de Contacto</span>
          <input
            v-model="email"
            type="email"
            class="h-9 px-3 rounded-sm border border-light-outline-variant font-body text-body-md"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-label text-label-md">Vigencia de Proformas (días) *</span>
          <input
            v-model.number="quoteValidityDays"
            type="number"
            min="1"
            max="30"
            required
            class="h-9 px-3 rounded-sm border border-light-outline-variant font-mono text-mono-md"
          />
        </label>
      </div>

      <footer
        class="px-gutter-lg py-gutter-sm border-t border-light-outline-variant bg-light-surface-container-low flex justify-end"
      >
        <button
          type="submit"
          :disabled="saving"
          class="h-9 px-gutter-xl rounded-sm bg-light-primary text-light-on-primary font-label text-label-lg hover:opacity-90 disabled:opacity-50"
        >
          {{ saving ? 'Guardando...' : 'Guardar Cambios de Marca Blanca' }}
        </button>
      </footer>
    </form>
  </main>
</template>
