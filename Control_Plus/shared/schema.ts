import { sql } from "drizzle-orm";
import { mysqlTable, varchar, int, date, decimal, mysqlEnum, uniqueIndex, datetime, tinyint } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabla Usuarios
export const usuarios = mysqlTable("usuarios", {
  id_usuario: int("id_usuario").primaryKey().autoincrement(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  apellido: varchar("apellido", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  contraseña: varchar("contraseña", { length: 255 }).notNull(),
  edad: int("edad"),
  sexo: mysqlEnum("sexo", ["Hombre", "Mujer", "Otro"]),
  peso: decimal("peso", { precision: 5, scale: 2 }),
  altura: decimal("altura", { precision: 5, scale: 2 }),
  role: mysqlEnum("role", ["Usuario", "Admin"]).default("Usuario"),
});

// Tabla ActividadFisica
export const actividadFisica = mysqlTable(
  "actividadfisica",
  {
    id_actividad: int("id_actividad").primaryKey().autoincrement(),
    id_usuario: int("id_usuario").notNull(),
    // Mapear como string para evitar problemas de zona horaria en DATE
    fecha: date("fecha", { mode: "string" }).notNull(),
  pasos: int("pasos"),
    duracion_minutos: int("duracion_minutos"),
  },
  (table) => ({
    uniqUsuarioFecha: uniqueIndex("uniq_usuario_fecha").on(table.id_usuario, table.fecha),
  })
);

// Tabla Alimentacion
export const alimentacion = mysqlTable("alimentacion", {
  id_alimento: int("id_alimento").primaryKey().autoincrement(),
  id_usuario: int("id_usuario").notNull(),
  // usar modo string para alineación con comparaciones y entradas desde el cliente
  fecha: date("fecha", { mode: "string" }).notNull(),
  comida: mysqlEnum("comida", ["Desayuno", "Almuerzo", "Cena", "Snack"]),
  calorias: decimal("calorias", { precision: 6, scale: 2 })
});

// Tabla Sueno
export const sueno = mysqlTable("sueno", {
  id_sueno: int("id_sueno").primaryKey().autoincrement(),
  id_usuario: int("id_usuario").notNull(),
  // Usar modo string para alinear con comparaciones por 'YYYY-MM-DD'
  fecha: date("fecha", { mode: "string" }).notNull(),
  horas_dormidas: decimal("horas_dormidas", { precision: 4, scale: 2 }),
  // calidad_sueno: mysqlEnum("calidad_sueno", ["Muy baja", "Baja", "Media", "Buena", "Excelente"]),
});

// Tabla Notificaciones
export const notificaciones = mysqlTable(
  "notificaciones",
  {
    id_notificacion: int("id_notificacion").primaryKey().autoincrement(),
    id_usuario: int("id_usuario").notNull(),
    tipo: mysqlEnum("tipo", ["actividad", "sueno", "alimentacion", "general"]).default("general"),
    titulo: varchar("titulo", { length: 200 }).notNull(),
    mensaje: varchar("mensaje", { length: 1000 }).notNull(),
    fecha_creacion: datetime("fecha_creacion").default(sql`CURRENT_TIMESTAMP`).notNull(),
    leida: tinyint("leida").default(0).notNull(),
    dedupe_key: varchar("dedupe_key", { length: 255 }),
  },
  (t) => ({
    // Dedupe opcional por usuario+clave (no estricto si ya existen datos). Si no aplica en DB, solo afecta Drizzle migrations.
    uniqUsuarioDedupe: uniqueIndex("uniq_notif_usuario_dedupe").on(t.id_usuario, t.dedupe_key),
  })
);

// Schemas para validación
export const insertUsuarioSchema = createInsertSchema(usuarios, {
  peso: z.number().min(0).max(500).optional().or(z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(500))).optional(),
  altura: z.number().min(0).max(300).optional().or(z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(300))).optional(),
}).omit({
  id_usuario: true,
  role: true,
});

export const loginUsuarioSchema = z.object({
  email: z.string().email(),
  contraseña: z.string().min(1),
});

// Esquema para actualización parcial de perfil (incluye email editable, excluye contraseña y rol)
export const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  email: z.string().email().max(150).optional(),
  edad: z.number().int().min(0).max(130).optional(),
  sexo: z.enum(["Hombre", "Mujer", "Otro"]).optional(),
  peso: z.number().min(0).max(500).optional(),
  altura: z.number().min(0).max(300).optional(),
});

export const insertActividadFisicaSchema = createInsertSchema(actividadFisica).omit({
  id_actividad: true,
});

export const insertAlimentacionSchema = createInsertSchema(alimentacion).omit({
  id_alimento: true,
});

export const insertSuenoSchema = createInsertSchema(sueno).omit({
  id_sueno: true,
});

// Types
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type LoginUsuario = z.infer<typeof loginUsuarioSchema>;
export type UpdateUsuario = z.infer<typeof updateUsuarioSchema>;
export type Usuario = typeof usuarios.$inferSelect;
export type ActividadFisica = typeof actividadFisica.$inferSelect;
export type Alimentacion = typeof alimentacion.$inferSelect;
export type Sueno = typeof sueno.$inferSelect;
export type Notificacion = typeof notificaciones.$inferSelect;
