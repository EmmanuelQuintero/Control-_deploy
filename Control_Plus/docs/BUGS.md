# BUGS - Entrega 6 (Control+)

Este archivo debe usarse para registrar errores encontrados durante las pruebas iniciales.

Formato: ID | Fecha | Área / Funcionalidad | Descripción | Pasos para reproducir | Resultado esperado | Resultado observado | Severidad | Estado | Comentarios

Ejemplos iniciales:

B-01 | 2025-10-27 | labelForDate / notificaciones (backend) | El backend usa `America/Bogota` para `labelForDate`, lo que puede provocar etiquetas "Hoy/Ayer" diferentes a las del cliente si el usuario está en otra zona horaria. | 1) Registrar datos hoy desde navegador con timezone distinta a America/Bogota 2) Revisar notificación y su texto | Texto debe decir 'Hoy' si la fecha corresponde al día local del usuario | Aparece 'Ayer' o fecha con distinto label en algunos casos | Medium | Open | Considerar usar timezone del usuario o la hora del servidor con coherencia.

B-02 | 2025-10-27 | Seguridad / Configuración | Credenciales de nodemailer están en el código (`server/email.ts`) | Revisar código fuente | Las credenciales NO deben estar en el repo; deben cargarse por variables de entorno | Actualmente las credenciales están hardcodeadas en `server/email.ts` y en otro archivo `server.cjs` | High | Open | Mover a `.env` y documentar en README.

B-03 | 2025-10-27 | Admin Dashboard | Tarjeta "Notifications Sent" estaba hardcodeada; puede confundir. | Abrir /admin | Valor debe reflejar datos reales o no mostrarse | La tarjeta existía con valor estático '142' (ya fue removida) | Low | Resolved | Se eliminó la tarjeta en `client/src/pages/admin-dashboard.tsx`.

B-04 | 2025-10-27 | Notificaciones / Admin (datos históricos) | El endpoint `GET /api/notifications/:id` devolvía notificaciones de salud históricas para usuarios Admin aunque el sistema ya evitaba crear nuevas notificaciones de salud para Admins. | 1) Llamar `GET /api/notifications/6` para un usuario admin (id=6) 2) Revisar items devueltos | No deberían devolverse notifs de salud para admin (o al menos deberíamos distinguir históricas) | Se retornaron notificaciones `actividad` y `sueno` para el admin (ej: `activity_missing_2025-10-26`) | Medium | Resolved | Solución: el endpoint ahora filtra server-side y solo devuelve notificaciones `tipo='general'` para usuarios con `role='Admin'`. Implementado en `server/routes.ts` (GET /api/notifications/:id_usuario). Si se requiere conservar acceso histórico, podemos añadir un query param `includeHealth=true` para administradores.


> Instrucciones: Al encontrar un bug, añade una fila con la información solicitada. Prioriza High / Medium / Low según impacto en funcionalidad y privacidad.
