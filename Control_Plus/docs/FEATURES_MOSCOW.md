# Tabla MoSCoW de funcionalidades — Proyecto Control+

Este documento lista las funcionalidades detectadas en el repositorio, su descripción, prioridad MoSCoW y el estado actual con evidencia (ruta/archivo).

| ID  | Funcionalidad | Descripción | Prioridad (MoSCoW) | Estado | Evidencia (archivo / ruta) | Notas |
|-----|---------------|-------------|--------------------:|--------|---------------------------|-------|
| F1  | Registro de usuario | Registro con email/contraseña | Must Have | Implementada | `server/routes.ts` (POST /api/register) | Envía notificación admin al registrarse |
| F2  | Login / Auth | Inicio de sesión, AuthContext y protección de rutas | Must Have | Implementada | `client/src/contexts/AuthContext.tsx` | Manejo de sesiones/cookies |
| F3  | Registrar sueño | Formulario y endpoint para guardar horas de sueño | Must Have | Implementada | `client/src/pages/sleep.tsx`, `server/routes.ts` (/api/sleep) | Genera notificación inmediata |
| F4  | Registrar actividad | Guardar pasos/duración y endpoint | Must Have | Implementada | `client/src/pages/exercise.tsx`, `server/routes.ts` (/api/activity) | Genera notificación inmediata |
| F5  | Registrar alimentación | Guardar comidas y calorías; vista de nutrición | Must Have | Implementada | `client/src/pages/nutrition.tsx`, `server/routes.ts` (/api/nutrition) | Vista ajustada (Entrega actual) |
| F6  | Motor de notificaciones (reglas) | Árbol de decisiones para crear notifs (missing/low/good) | Must Have | Implementada | `server/notifications.ts` | Auto-hide de mensajes conflictivos y dedupe |
| F7  | Dedupe / Update notifications | Evitar duplicados y actualizar notifs con misma dedupe_key | Must Have | Implementada | `server/storage.ts` (createNotification update) | Resurface on update |
| F8  | Poller y tick inmediato | Hook que consulta / muestra toasts cada 60s + evento manual | Must Have | Implementada | `client/src/hooks/use-notifications-poller.ts` | Soporta tick tras guardar datos |
| F9  | Campana & badge (UI) | Icono campana, dropdown con notifs, badge de no leídas | Must Have | Implementada | `client/src/components/notification-bell.tsx` | Filtrado admin: sólo `tipo='general'` |
| F10 | Historial de notificaciones (página) | Página con notifs agrupadas por fecha | Must Have | Implementada | `client/src/pages/notifications.tsx` | Filtrado admin aplicado |
| F11 | Admin dashboard básico | Dashboard con stats y listado de usuarios | Should Have | Implementada | `client/src/pages/admin-dashboard.tsx` | Tarjeta “Notifications Sent” removida recientemente |
| F12 | Admin — Compositor notifs (UI) | Componente para enviar notifs/admin emails | Should Have | Implementada | `client/src/components/notification-composer.tsx` | Soporta envío por email y notifs en app |
| F13 | Admin — Envío por email (backend) | Endpoint que manda correos a usuarios seleccionados | Should Have | Implementada | `server/email.ts`, `server/routes.ts` (/api/admin/send-email-notification) | Usa nodemailer (ver nota de seguridad) |
| F14 | Usuarios CRUD (admin) | Listado y edición básica de usuarios | Should Have | Implementada | `server/routes.ts` (`/api/admin/users`, PUT /api/users/:id`) | La edición oculta contraseña en respuesta |
| F15 | Metas locales (calorías/sueño) | Metas guardadas en localStorage y UI para editarlas | Could Have | Implementada (local) | `client/src/pages/nutrition.tsx` (localStorage) | Metas por usuario en localStorage |
| F16 | Estadísticas y gráficas | Gráficos placeholder en admin | Could Have | Parcial | `client/src/pages/admin-dashboard.tsx` (placeholder) | Implementar gráficas reales en futuro |
| F17 | Internacionalización básica | Date formatting y labels en español | Could Have | Parcial | `client/src/lib/notifications.ts` (formatDateTime) | backend labelForDate usa America/Bogota (nota) |

---

## Resumen Must Have
- Total funcionalidades listadas: 17
- Total **Must Have**: 9
- Must Have implementadas: 9
- Cobertura Must Have: **100%** (9/9)
