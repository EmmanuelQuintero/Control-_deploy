import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está definido');
  const conn = await mysql.createConnection(url);
  try {
    console.log('Eliminando duplicados en actividadfisica...');
    const [result] = await conn.execute(
      `DELETE t1
       FROM actividadfisica t1
       JOIN actividadfisica t2
         ON t1.id_usuario = t2.id_usuario
        AND t1.fecha = t2.fecha
        AND t1.id_actividad < t2.id_actividad;`
    );
    // @ts-ignore - mysql2 types: result has affectedRows
    console.log('Filas eliminadas:', (result as any).affectedRows ?? result);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
