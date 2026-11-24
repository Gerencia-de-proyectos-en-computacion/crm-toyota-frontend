import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WorkshopSettings } from '@/types/crm'
import { api } from '@/services/api'

export const useWorkshopConfigStore = defineStore('workshopConfig', () => {
  const settings = ref<WorkshopSettings>({
    businessName: '[Nombre del Taller Automotriz]',
    slogan: 'Servicio Técnico y Repuestos Especializados Toyota',
    ruc: '20000000001',
    address: 'Av. Angamos Este 1840, Surquillo — Lima, Perú',
    phone: '+51 999 888 777',
    email: 'mostrador@tallertecnicotoyota.pe',
    currencySymbol: 'S/',
    quoteValidityDays: 7,
    updatedAt: new Date().toISOString(),
  })

  async function fetchSettings() {
    try {
      const { data } = await api.get<WorkshopSettings>('/api/v1/workshop-settings')
      settings.value = data
    } catch {
      // Mantiene placeholder limpio si el servidor aún inicia
    }
  }

  async function updateSettings(payload: {
    businessName: string
    slogan: string
    ruc: string
    address: string
    phone: string
    email: string | null
    quoteValidityDays: number
  }) {
    const { data } = await api.put<WorkshopSettings>('/api/v1/workshop-settings', payload)
    settings.value = data
    return data
  }

  return { settings, fetchSettings, updateSettings }
})
