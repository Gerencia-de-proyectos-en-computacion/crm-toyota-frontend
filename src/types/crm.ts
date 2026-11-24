export type Role = 'ADMIN' | 'RECEPCIONISTA' | 'ALMACEN'
export type DocumentType = 'DNI' | 'RUC'
export type PartBrand = 'TOYOTA_OEM' | 'DENSO' | 'AISIN' | 'ALTERNATIVO'
export type StockAlertLevel = 'CRITICO' | 'ALERTA' | 'NORMAL'
export type QuoteStatus = 'PENDIENTE' | 'APROBADA' | 'CERRADA' | 'RECHAZADA'
export type RejectionReason = 'FALTA_STOCK' | 'PRECIO' | 'TIEMPO_ESPERA' | 'OTRO'
export type QuoteItemType = 'PART' | 'LABOR'

export interface AuthSession {
  accessToken: string
  expiresAt: string
  userId: number
  username: string
  fullName: string
  stationLabel: string
  role: Role
  maxDiscountPercent: number
}

export interface WorkshopSettings {
  businessName: string
  slogan: string
  ruc: string
  address: string
  phone: string
  email: string | null
  currencySymbol: string
  quoteValidityDays: number
  updatedAt: string
}

export interface EquivalentPartOption {
  partId: number
  sku: string
  oemReferenceCode: string
  brand: PartBrand
  name: string
  salePriceIgv: number
  currentStock: number
  alertLevel: StockAlertLevel
}

export interface PartItem {
  id: number
  sku: string
  oemReferenceCode: string
  brand: PartBrand
  name: string
  category: string
  compatibleSummary: string
  salePriceIgv: number
  currentStock: number
  minStock: number
  reorderPoint: number | null
  alertLevel: StockAlertLevel
  availableEquivalents: EquivalentPartOption[]
}

export interface LaborRateItem {
  id: number
  code: string
  serviceName: string
  estimatedHours: number
  intervalKm: number | null
  priceIgv: number
}

export interface KitPartLine {
  partId: number
  sku: string
  oemReferenceCode: string
  brand: PartBrand
  name: string
  quantity: number
  unitPriceIgv: number
  currentStock: number
  alertLevel: StockAlertLevel
}

export interface MaintenanceKit {
  id: number
  code: string
  name: string
  model: string
  intervalKm: number
  laborRate: LaborRateItem
  parts: KitPartLine[]
  estimatedKitTotalIgv: number
}

export interface CustomerItem {
  id: number
  documentType: DocumentType
  documentNumber: string
  fullName: string
  phone: string
  email: string | null
  address: string | null
  dataConsentAccepted: boolean
  dataConsentAt: string
  consentVersion: string
}

export interface VehicleItem {
  id: number
  customerId: number
  customerName: string
  customerDocumentType: DocumentType
  customerDocumentNumber: string
  customerPhone: string
  licensePlate: string
  specialPlate: boolean
  vin: string | null
  model: string
  manufactureYear: number
  trimVersion: string
  currentMileageKm: number
  suggestedPreventiveKit: MaintenanceKit | null
}

export interface DraftCartLine {
  itemType: QuoteItemType
  partId: number | null
  laborRateId: number | null
  code: string
  description: string
  unitPriceIgv: number
  quantity: number
}

export interface QuoteItemResponse {
  id: number
  itemType: QuoteItemType
  partId: number | null
  laborRateId: number | null
  itemCode: string
  description: string
  quantity: number
  unitPriceIgv: number
  lineTotalIgv: number
  availableStock: number | null
}

export interface QuoteResponse {
  id: number
  quoteNumber: string
  status: QuoteStatus
  rejectionReason: RejectionReason | null
  rejectionNotes: string | null
  customerId: number
  customerName: string
  customerDocumentType: string
  customerDocumentNumber: string
  customerPhone: string
  vehicleId: number
  licensePlate: string
  vehicleSummary: string
  mileageAtQuote: number
  grossTotalIgv: number
  discountPercent: number
  discountAmount: number
  taxableSubtotal: number
  igvAmount: number
  finalTotalIgv: number
  validUntil: string
  notes: string | null
  createdByName: string
  whatsappUrl: string
  createdAt: string
  updatedAt: string
  items: QuoteItemResponse[]
}

export interface StockConflictDetail {
  partId: number
  sku: string
  oemReferenceCode: string
  partName: string
  brand: PartBrand
  requestedQty: number
  availableQty: number
  compatibleEquivalents: EquivalentPartOption[]
}

export interface RestockAlertRow {
  partId: number
  sku: string
  oemReferenceCode: string
  partName: string
  brand: PartBrand
  compatibleModels: string
  currentStock: number
  minStock: number
  predictedDemand: number
  reorderPoint: number
  suggestedOrderQty: number
  alertLevel: StockAlertLevel
}

export interface ForecastDashboardResponse {
  modelHealth: {
    modelVersion: string
    horizonLabel: string
    r2: number
    wapePercent: number
    rmse: number
    mapeNonzeroPercent: number
    adi: number
    executionSource: string
    calculatedAt: string
  }
  criticalCount: number
  warningCount: number
  lostSales: {
    lostAmountLackOfStockSoles: number
    rejectedQuotesLackOfStockCount: number
    totalRejectedQuotesCount: number
  }
  conversion: {
    conversionRatePercent: number
    approvedOrClosedCount: number
    totalDecidedOrActiveCount: number
  }
  alerts: RestockAlertRow[]
}

export interface InventoryMovementItem {
  id: number
  partId: number
  sku: string
  partName: string
  movementType: string
  quantityDelta: number
  stockAfter: number
  supplierName: string | null
  referenceDoc: string | null
  unitCost: number | null
  performedBy: string
  createdAt: string
}
