require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN
// ==========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000
});

// ==========================================
// CONEXIÓN Y TABLA
// ==========================================

async function iniciarBaseDeDatos() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ BASE DE DATOS POSTGRESQL CONECTADA');
    console.log('✅ TABLA app_state LISTA');

    return true;

  } catch (error) {

    console.error('❌ ERROR AL INICIAR POSTGRESQL:');
    console.error(error.message);

    return false;
  }
}

// ==========================================
// LEER DATOS DE POSTGRESQL
// ==========================================

async function readState() {

  const result = await pool.query(`
    SELECT data
    FROM app_state
    WHERE id = 1
  `);

  if (result.rows.length > 0) {
    return result.rows[0].data;
  }

  return null;
}

// ==========================================
// GUARDAR DATOS EN POSTGRESQL
// ==========================================

async function writeState(data) {

  if (!data || typeof data !== 'object') {
    throw new Error('Los datos recibidos no son válidos');
  }

  await pool.query(`
    INSERT INTO app_state (
      id,
      data,
      updated_at
    )
    VALUES (
      1,
      $1::jsonb,
      CURRENT_TIMESTAMP
    )

    ON CONFLICT (id)
    DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = CURRENT_TIMESTAMP
  `, [JSON.stringify(data)]);

}

// ==========================================
// API — OBTENER TODOS LOS DATOS
// ==========================================

app.get('/api/state', async (req, res) => {

  try {

    const data = await readState();

    console.log(
      data
        ? '📥 Datos cargados desde PostgreSQL'
        : '📭 PostgreSQL todavía no tiene datos'
    );

    res.json({
      ok: true,
      data: data
    });

  } catch (error) {

    console.error('❌ ERROR AL LEER POSTGRESQL:');
    console.error(error);

    // IMPORTANTE:
    // Si PostgreSQL falla, NO enviamos ok:true
    // para evitar que el frontend crea que recibió datos válidos.

    res.status(500).json({
      ok: false,
      error: 'No se pudieron cargar los datos desde PostgreSQL'
    });

  }

});

// ==========================================
// API — GUARDAR TODOS LOS DATOS
// ==========================================

app.put('/api/state', async (req, res) => {

  try {

    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {

      return res.status(400).json({
        ok: false,
        error: 'Datos inválidos'
      });

    }

    await writeState(req.body);

    console.log('💾 DATOS GUARDADOS CORRECTAMENTE EN POSTGRESQL');

    res.json({
      ok: true,
      savedAt: new Date().toISOString(),
      mensaje: 'Datos guardados correctamente'
    });

  } catch (error) {

    console.error('❌ ERROR AL GUARDAR EN POSTGRESQL:');
    console.error(error);

    res.status(500).json({
      ok: false,
      error: 'No se pudieron guardar los datos en PostgreSQL',
      detalle: error.message
    });

  }

});

// ==========================================
// PRUEBA DE BASE DE DATOS
// ==========================================

app.get('/api/test-db', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        NOW() AS fecha,
        current_database() AS base_de_datos
    `);

    res.json({
      ok: true,
      mensaje: 'Conectado correctamente a PostgreSQL 🎉',
      datos: result.rows[0]
    });

  } catch (error) {

    console.error('❌ ERROR COMPLETO POSTGRESQL:');
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: error.message,
      codigo: error.code
    });

  }

});

// ==========================================
// ABRIR INDEX.HTML
// ==========================================

app.get('*', (req, res) => {

  res.sendFile(
    path.join(__dirname, 'index.html')
  );

});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

async function iniciarServidor() {

  const dbOk = await iniciarBaseDeDatos();

  if (!dbOk) {

    console.error(
      '⚠️ El servidor no se iniciará porque PostgreSQL no está disponible.'
    );

    process.exit(1);
  }

  app.listen(PORT, () => {

    console.log(
      `🚗 Pits Admin listo en el puerto ${PORT}`
    );

  });

}

iniciarServidor();