# Arquitectura Visual `1366x768` e Integración Google Stitch (`frontend-web`)

## 1. Pantallas y Componentes Implementados (`<script setup lang="ts">`)
- `src/components/AppShell.vue`: Barra lateral colapsable (`64px` <-> `192px`) filtrada por rol RBAC + cabecera de `48px` con marca blanca dinámica e indicador de autoguardado cada 5s. *(Nota de alcance: se excluyó el ítem "Órdenes" de bahía y el texto "Facturada" de los prototipos crudos de Stitch para respetar al 100% la línea base PMBOK).*
- `src/views/LoginView.vue`: Inicio de sesión con turno de 14h y botones de acceso rápido 1-clic (`Recepcionista`, `Almacén`, `Admin`).
- `src/views/PosCounterView.vue`: Cotizador Express POS de 2 columnas (`62%` / `38%`) sin scroll horizontal en `1366x768`, sugerencia automática de Kit Preventivo por kilometraje (`EXT01`), exportación OpenPDF `< 3s` con fallback `@media print` (`RNF04`) y envío por WhatsApp `wa.me` (`EXT02`).
- `src/views/QuotesManagementView.vue` + `StockConflictModal.vue` + `RejectQuoteModal.vue`: Flujo completo `PENDIENTE -> APROBADA -> CERRADA | RECHAZADA`, visualización de fecha/hora de atención (`closedAt` en `America/Lima`) al cerrar la venta, resolución 1-clic de quiebres `HTTP 409` con equivalentes OEM/Denso/Aisin y reintegro de stock al anular aprobadas.
- `src/views/CustomersVehiclesView.vue`: Alta y búsqueda con validación DNI/RUC, placas MTC y sello verificable de consentimiento **Ley N.º 29733**.
- `src/views/InventoryForecastView.vue`: Dashboard de pronóstico Random Forest (`R²`, `WAPE`, `MAPE>0`, `ADI`), KPI de ventas perdidas por falta de stock (`EXT03`), recálculo batch y modal de ingreso rápido de compras (`EXT04`).
- `src/views/CatalogPricingView.vue` + `src/components/PartPriceModal.vue`: Pantalla exclusiva `ADMIN` (`/catalogo-precios`) basada 1:1 en Google Stitch para gestionar el catálogo OEM/Equivalentes, el tarifario de mano de obra y precios de venta (`S/` inc. IGV 18%) con desglose de base imponible e IGV en tiempo real.
- `src/views/SettingsView.vue`: Configuración en vivo de Marca Blanca (`workshop_settings`) con botón de restauración de placeholder neutro para visitas multi-taller.

## 2. Variables de Entorno (`VITE_*`)
- `VITE_API_BASE_URL`: URL base del backend Spring Boot (por defecto `http://localhost:8080`).
