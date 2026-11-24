import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useQuoteDraftStore } from '@/stores/quoteDraft'
import { useAuthStore } from '@/stores/auth'
import StockConflictModal from '@/components/StockConflictModal.vue'
import RejectQuoteModal from '@/components/RejectQuoteModal.vue'
import type { MaintenanceKit } from '@/types/crm'

describe('CRM-TOYOTA Frontend Mostrador & Modales Stitch', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('calcula desglose exacto de IGV 18% incluido y aplica tope de descuento por rol', () => {
    const draft = useQuoteDraftStore()
    draft.addPart({ id: 1, sku: 'TOY-FIL-041', name: 'Filtro Aceite', brand: 'TOYOTA_OEM', salePriceIgv: 45 })
    draft.addPart({ id: 5, sku: 'TOY-OIL-530', name: 'Aceite 5W-30', brand: 'TOYOTA_OEM', salePriceIgv: 165 })
    draft.addPart({ id: 7, sku: 'TOY-PAD-523', name: 'Pastillas OEM', brand: 'TOYOTA_OEM', salePriceIgv: 190 })
    draft.addLabor({ id: 3, code: 'MO-MANT-40K', serviceName: 'Mantenimiento 40k', priceIgv: 80 })

    expect(draft.grossTotalIgv).toBe(480.0)
    expect(draft.taxableSubtotal).toBe(406.78)
    expect(draft.igvAmount).toBe(73.22)
    expect(draft.finalTotalIgv).toBe(480.0)

    // Recepcionista intenta 12% -> se topa en 5%
    draft.setCappedDiscount(12, 5)
    expect(draft.discountPercent).toBe(5)
    expect(draft.discountAmount).toBe(24.0)
    expect(draft.finalTotalIgv).toBe(456.0)

    // Admin aplica 10% -> permitido hasta 15%
    draft.setCappedDiscount(10, 15)
    expect(draft.discountPercent).toBe(10)
    expect(draft.finalTotalIgv).toBe(432.0)
  })

  it('precarga Kit Preventivo sugerido sin duplicar repuestos existentes y persiste en LocalStorage', () => {
    const draft = useQuoteDraftStore()
    const kit: MaintenanceKit = {
      id: 1,
      code: 'KIT-YARIS-40K',
      name: 'Kit Mantenimiento 40,000 km Yaris',
      model: 'Yaris',
      intervalKm: 40000,
      estimatedKitTotalIgv: 290,
      laborRate: {
        id: 3,
        code: 'MO-MANT-40K',
        serviceName: 'Mantenimiento 40k',
        estimatedHours: 1.5,
        intervalKm: 40000,
        priceIgv: 80,
      },
      parts: [
        {
          partId: 1,
          sku: 'TOY-FIL-041',
          oemReferenceCode: '04152-YZZA6',
          brand: 'TOYOTA_OEM',
          name: 'Filtro Aceite',
          quantity: 1,
          unitPriceIgv: 45,
          currentStock: 18,
          alertLevel: 'NORMAL',
        },
      ],
    }

    draft.loadPreventiveKit(kit)
    draft.loadPreventiveKit(kit)
    draft.persistNow()
    expect(draft.items).toHaveLength(2)
    expect(localStorage.getItem('crm_toyota_pos_draft_v1')).toContain('TOY-FIL-041')
    expect(localStorage.getItem('crm_toyota_pos_draft_v1')).toContain('MO-MANT-40K')
  })

  it('detecta ventana < 2h para renovación silenciosa del JWT de 14h', () => {
    const auth = useAuthStore()
    const inNinetyMin = new Date(Date.now() + 90 * 60 * 1000).toISOString()
    auth.setSession({
      accessToken: 'jwt-demo',
      expiresAt: inNinetyMin,
      userId: 2,
      username: 'recepcion',
      fullName: 'Carlos Mendoza',
      stationLabel: 'Caja 02',
      role: 'RECEPCIONISTA',
      maxDiscountPercent: 5,
    })
    expect(auth.shouldSilentRefresh()).toBe(true)

    const inTenHours = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString()
    auth.setSession({ ...auth.session!, expiresAt: inTenHours })
    expect(auth.shouldSilentRefresh()).toBe(false)
  })

  it('renderiza Modal A (409 Conflicto de Stock) y emite sustitución en 1 clic', async () => {
    const wrapper = mount(StockConflictModal, {
      props: {
        open: true,
        quoteNumber: 'COT-2026-00042',
        conflicts: [
          {
            partId: 6,
            sku: 'AIS-PAD-0D1',
            oemReferenceCode: '04465-0D150',
            partName: 'Pastillas Delanteras',
            brand: 'AISIN',
            requestedQty: 2,
            availableQty: 0,
            compatibleEquivalents: [
              {
                partId: 8,
                sku: 'DEN-PAD-523',
                oemReferenceCode: '04465-0D150',
                brand: 'DENSO',
                name: 'Pastillas Cerámicas',
                salePriceIgv: 175,
                currentStock: 6,
                alertLevel: 'NORMAL',
              },
            ],
          },
        ],
      },
    })

    expect(wrapper.text()).toContain('COT-2026-00042')
    expect(wrapper.text()).toContain('DEN-PAD-523')
    await wrapper.find('button.bg-light-primary').trigger('click')
    expect(wrapper.emitted('substitute')?.[0]).toEqual([6, 8])
  })

  it('renderiza Modal B (Rechazo con reintegro de stock si estaba APROBADA)', async () => {
    const wrapper = mount(RejectQuoteModal, {
      props: {
        open: true,
        quoteNumber: 'COT-2026-00040',
        customerName: 'María Quispe',
        currentStatus: 'APROBADA',
      },
    })

    expect(wrapper.text()).toContain('reintegrarán atómicamente')
    await wrapper.find('button.bg-light-primary').trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual(['FALTA_STOCK', ''])
  })
})
