# Estado, Resiliencia y Marca Blanca — `frontend-web`

## 1. Stores de Pinia
- `useAuthStore`: Sesión JWT de 14h + renovación silenciosa automática (`< 2h` restantes) para nunca cortar una atención en curso.
- `useWorkshopConfigStore`: Datos de marca blanca del taller (`businessName`, `ruc`, `address`, `phone`, `slogan`), con placeholder por defecto `"[Nombre del Taller Automotriz]"`.
- `useQuoteDraftStore`: Persistencia reactiva en `localStorage` cada 5 segundos mediante `@vueuse/core`.

## 2. Fallbacks de Operación Continua
- **Impresión de Emergencia (`@media print`):** Si falla o tarda la descarga del PDF desde el servidor, `window.print()` formatea limpiamente la proforma ocultando menús y botones.
- **Manejo de Conflicto de Stock (`HTTP 409`):** Muestra modal claro indicando qué pieza quebró stock y ofrece reemplazarla en 1 clic por su equivalente compatible disponible.
