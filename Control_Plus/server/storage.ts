import { type Usuario, type InsertUsuario, type UpdateUsuario, usuarios, alimentacion, sueno, notificaciones, type Notificacion } from "@shared/schema";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export interface IStorage {
  getUsuario(id: number): Promise<Usuario | undefined>;
  getUsuarioByEmail(email: string): Promise<Usuario | undefined>;
  insertUsuario(user: InsertUsuario): Promise<Usuario>;
  countUsuarios(): Promise<number>;
  listUsuarios(): Promise<Pick<Usuario, 'id_usuario' | 'nombre' | 'apellido' | 'email' | 'role'>[]>;
  updateUsuario(id: number, data: UpdateUsuario): Promise<Usuario>;
  insertOrUpdateActividadFisica(data: { id_usuario: number; fecha: string; pasos: number; duracion_minutos: number }): Promise<void>;
  getActividadesFisicas(id_usuario: number, from?: string, to?: string): Promise<any[]>;
  getAlimentacion(id_usuario: number, from?: string, to?: string): Promise<any[]>;
  getSueno(id_usuario: number, from?: string, to?: string): Promise<any[]>;
  insertAlimentacion(data: { id_usuario: number; fecha: string; comida: 'Desayuno'|'Almuerzo'|'Cena'|'Snack'; calorias?: number }): Promise<void>;
  // Notificaciones
  createNotification(data: { id_usuario: number; tipo?: 'actividad'|'sueno'|'alimentacion'|'general'; titulo: string; mensaje: string; dedupe_key?: string }): Promise<void>;
  getNotifications(id_usuario: number, sinceIso?: string): Promise<Notificacion[]>;
  markNotificationsRead(id_usuario: number, ids: number[]): Promise<number>;
  markNotificationReadByDedupeKey(id_usuario: number, dedupeKey: string): Promise<number>;
}

import { actividadFisica } from "@shared/schema";
import { eq, and, gte, lte, gt } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async insertOrUpdateActividadFisica(data: { id_usuario: number; fecha: string; pasos: number; duracion_minutos: number }): Promise<void> {
    const db = await getDb();
  // Trabajar con fecha como string 'YYYY-MM-DD' directamente
  const fechaStr = data.fecha;
    // Buscar si ya existe registro para ese usuario y fecha
    // Upsert: insert y si hay conflicto por índice único, actualizar
    await db
      .insert(actividadFisica)
      .values({
        id_usuario: data.id_usuario,
        fecha: fechaStr,
        pasos: data.pasos,
        duracion_minutos: data.duracion_minutos,
      })
      .onDuplicateKeyUpdate({
        set: {
          pasos: data.pasos,
          duracion_minutos: data.duracion_minutos,
        },
      });
  }

  async getActividadesFisicas(id_usuario: number, from?: string, to?: string): Promise<any[]> {
    const db = await getDb();
    let whereClause;
    if (from && to) {
      const fromStr = from; // 'YYYY-MM-DD'
      const toStr = to;     // 'YYYY-MM-DD'
      whereClause = and(
        eq(actividadFisica.id_usuario, id_usuario),
        gte(actividadFisica.fecha, fromStr),
        lte(actividadFisica.fecha, toStr)
      );
    } else {
      whereClause = eq(actividadFisica.id_usuario, id_usuario);
    }
    // Ordenar por fecha descendente (más reciente primero)
    return await db.select().from(actividadFisica).where(whereClause).orderBy(sql`fecha DESC`);
  }
  async getUsuario(id: number): Promise<Usuario | undefined> {
    const db = await getDb();
    const result = await db.select().from(usuarios).where(eq(usuarios.id_usuario, id)).limit(1);
    return result[0];
  }

  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
    const db = await getDb();
    const result = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
    return result[0];
  }

  async insertUsuario(insertUsuario: InsertUsuario): Promise<Usuario> {
    const db = await getDb();
    
    // Convertir peso y altura a strings si son números (requerido por campos decimal en MySQL)
    const dataToInsert = {
      ...insertUsuario,
      peso: insertUsuario.peso != null ? String(insertUsuario.peso) : undefined,
      altura: insertUsuario.altura != null ? String(insertUsuario.altura) : undefined,
    };
    
    const result = await db.insert(usuarios).values(dataToInsert);
    const insertedId = result[0].insertId;
    
    // Obtener el usuario recién insertado
    const newUsuario = await this.getUsuario(Number(insertedId));
    if (!newUsuario) {
      throw new Error("Error al crear el usuario");
    }
    
    return newUsuario;
  }

  async countUsuarios(): Promise<number> {
    const db = await getDb();
    // Drizzle: seleccionar COUNT(*)
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(usuarios);
    return result[0]?.count ?? 0;
  }

  async listUsuarios(): Promise<Pick<Usuario, 'id_usuario' | 'nombre' | 'apellido' | 'email' | 'role'>[]> {
    const db = await getDb();
    const result = await db
      .select({
        id_usuario: usuarios.id_usuario,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        email: usuarios.email,
        role: usuarios.role,
      })
      .from(usuarios);
    return result;
  }

  async updateUsuario(id: number, data: UpdateUsuario): Promise<Usuario> {
    const db = await getDb();
    // Construir objeto de actualización filtrando undefined
    const updateData: Record<string, any> = {};
    for (const key of [
      'nombre','apellido','email','edad','sexo','peso','altura'
    ] as const) {
      if (data[key] !== undefined) {
        // Convertir peso y altura a strings si son números
        if (key === 'peso' || key === 'altura') {
          updateData[key] = String(data[key]);
        } else {
          updateData[key] = data[key];
        }
      }
    }
    if (Object.keys(updateData).length === 0) {
      const existing = await this.getUsuario(id);
      if (!existing) throw new Error('Usuario no encontrado');
      return existing;
    }
    await db.update(usuarios).set(updateData).where(eq(usuarios.id_usuario, id));
    const updated = await this.getUsuario(id);
    if (!updated) throw new Error('Usuario no encontrado tras actualizar');
    return updated;
  }

  async getAlimentacion(id_usuario: number, from?: string, to?: string): Promise<any[]> {
    const db = await getDb();
    
    if (from && to) {
      return await db
        .select()
        .from(alimentacion)
        .where(and(eq(alimentacion.id_usuario, id_usuario), gte(alimentacion.fecha, from), lte(alimentacion.fecha, to)))
        .orderBy(sql`fecha DESC`);
    }
    
    return await db.select().from(alimentacion).where(eq(alimentacion.id_usuario, id_usuario)).orderBy(sql`fecha DESC`);
  }

  async insertAlimentacion(data: { id_usuario: number; fecha: string; comida: 'Desayuno'|'Almuerzo'|'Cena'|'Snack'; descripcion?: string; calorias?: number; proteinas?: number; grasas?: number; carbohidratos?: number }): Promise<void> {
    const db = await getDb();
    await db.insert(alimentacion).values({
      id_usuario: data.id_usuario,
      fecha: data.fecha, // MySQL DATE; drizzle aceptará string 'YYYY-MM-DD'
      comida: data.comida,
      calorias: data.calorias != null ? String(data.calorias) : undefined
    });
  }

  async getSueno(id_usuario: number, from?: string, to?: string): Promise<any[]> {
    const db = await getDb();
    
    if (from && to) {
      return await db
        .select()
        .from(sueno)
        .where(and(eq(sueno.id_usuario, id_usuario), gte(sueno.fecha, from), lte(sueno.fecha, to)))
        .orderBy(sql`fecha DESC`);
    }
    
    return await db.select().from(sueno).where(eq(sueno.id_usuario, id_usuario)).orderBy(sql`fecha DESC`);
  }

  async insertOrUpdateSueno(data: { id_usuario: number; fecha: string; horas_dormidas: number; calidad_sueno?: string }) {
    const db = await getDb();
    // Buscar si ya existe un registro para ese usuario y fecha
    const existing = await db.select()
      .from(sueno)
      .where(
        sql`${sueno.id_usuario} = ${data.id_usuario} AND ${sueno.fecha} = ${data.fecha}`
      )
      .limit(1);

    if (existing.length > 0) {
      // Actualizar registro existente
      await db.update(sueno)
        .set({
          horas_dormidas: String(data.horas_dormidas),
        })
        .where(
          sql`${sueno.id_usuario} = ${data.id_usuario} AND ${sueno.fecha} = ${data.fecha}`
        );
    } else {
      // Insertar nuevo registro
      await db.insert(sueno).values({
        id_usuario: data.id_usuario,
        // fecha es string 'YYYY-MM-DD' (schema: mode:'string')
        fecha: data.fecha,
        horas_dormidas: String(data.horas_dormidas),
      });
    }
  }

  // ===================== Notificaciones =====================
  async createNotification(data: { id_usuario: number; tipo?: 'actividad'|'sueno'|'alimentacion'|'general'; titulo: string; mensaje: string; dedupe_key?: string }): Promise<void> {
    const db = await getDb();
    // Evitar duplicados por dedupe_key del mismo día
    if (data.dedupe_key) {
      const existing = await db.select().from(notificaciones).where(sql`${notificaciones.id_usuario} = ${data.id_usuario} AND ${notificaciones.dedupe_key} = ${data.dedupe_key}`).limit(1);
      if (existing.length > 0) {
        // Actualizar la notificación existente para reflejar el estado más reciente
        const id = existing[0].id_notificacion as number;
        await db.execute(sql`UPDATE ${notificaciones}
          SET titulo = ${data.titulo},
              mensaje = ${data.mensaje},
              tipo = ${data.tipo ?? 'general'},
              leida = 0,
              fecha_creacion = NOW()
          WHERE id_notificacion = ${id}`);
        return;
      }
    }
    await db.insert(notificaciones).values({
      id_usuario: data.id_usuario,
      tipo: (data.tipo ?? 'general') as any,
      titulo: data.titulo,
      mensaje: data.mensaje,
      dedupe_key: data.dedupe_key,
    });
  }

  async getNotifications(id_usuario: number, sinceIso?: string): Promise<Notificacion[]> {
    const db = await getDb();
    if (sinceIso) {
      // Convertir sinceIso a epoch seconds para evitar formatos incompatibles con MySQL
      const d = new Date(sinceIso);
      const ts = Number.isNaN(d.getTime()) ? undefined : Math.floor(d.getTime() / 1000);
      if (ts !== undefined) {
        return await db
          .select()
          .from(notificaciones)
          .where(and(
            eq(notificaciones.id_usuario, id_usuario),
            sql`UNIX_TIMESTAMP(${notificaciones.fecha_creacion}) > ${ts}`
          ))
          .orderBy(sql`fecha_creacion DESC`)
          .limit(50);
      }
    }
    return await db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.id_usuario, id_usuario))
      .orderBy(sql`fecha_creacion DESC`)
      .limit(50);
  }

  async markNotificationsRead(id_usuario: number, ids: number[]): Promise<number> {
    if (!ids.length) return 0;
    const db = await getDb();
    await db.execute(sql`UPDATE ${notificaciones} SET leida = 1 WHERE id_usuario = ${id_usuario} AND id_notificacion IN (${sql.join(ids, sql`, `)})`);
    return ids.length;
  }

  async markNotificationReadByDedupeKey(id_usuario: number, dedupeKey: string): Promise<number> {
    const db = await getDb();
    const res: any = await db.execute(sql`UPDATE ${notificaciones} SET leida = 1 WHERE id_usuario = ${id_usuario} AND ${notificaciones.dedupe_key} = ${dedupeKey}`);
    const affected = typeof res?.affectedRows === 'number' ? res.affectedRows : 0;
    return affected;
  }
}

export const storage = new DatabaseStorage();
