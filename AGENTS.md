# `crm-toyota-frontend` — Reglas Locales del Repositorio

1. **Stack:** Vue 3 estrictamente con `<script setup lang="ts">` (prohibido Options API y `any`) + Vite + Pinia + Tailwind CSS + `@vueuse/core` + Vitest.
2. **Ergonomía Mostrador:** Optimizado para `1366x768` sin scroll horizontal; Cotizador POS de 2 columnas (`<= 3 pasos`, `< 3 min`); autoguardado en `localStorage` cada 5s; fallback `@media print`; envío rápido por WhatsApp (`wa.me`); marca blanca dinámica vía `useWorkshopConfigStore()`.
3. **Docs-as-Code:** Mantener `docs/` sincronizado ante cambios de vistas, stores o variables `VITE_*`.
