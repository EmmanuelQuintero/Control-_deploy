#!/usr/bin/env node
// Script sencillo para añadir la columna `descripcion` a la tabla `alimentacion` si falta.
// Lee la conexión desde env `DATABASE_URL`.

require('dotenv/config');
const mysql = require('mysql2/promise');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Error: debe definir la variable de entorno DATABASE_URL (ej: mysql://user:pass@host/db)');
    process.exit(1);
  }

  let conn;
  try {
    conn = await mysql.createConnection(url);
  } catch (e) {
    console.error('Error conectando a la base de datos:', e.message || e);
    process.exit(1);
  }

  try {
    const [rows] = await conn.execute("SHOW COLUMNS FROM alimentacion LIKE 'descripcion'");
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('La columna `descripcion` ya existe en `alimentacion`. No se requiere acción.');
    } else {
      console.log('La columna `descripcion` NO existe. Ejecutando ALTER TABLE para agregarla...');
      await conn.execute("ALTER TABLE alimentacion ADD COLUMN descripcion VARCHAR(1000) NULL");
      console.log('Columna `descripcion` agregada correctamente.');
    }
  } catch (err) {
    console.error('Error ejecutando consulta:', err.message || err);
    process.exit(1);
  } finally {
    try { if (conn) await conn.end(); } catch (_) {}
  }
}

main();
