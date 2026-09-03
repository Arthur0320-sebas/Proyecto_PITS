require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'data', 'state.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000
});

pool.connect()
  .then(client => {
    console.log('✅ BASE DE DATOS POSTGRESQL CONECTADA CORRECTAMENTE');
    client.release();
  })
  .catch(error => {
    console.error('❌ ERROR AL CONECTAR A POSTGRESQL:', error.message);
});
async function crearTabla() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ TABLA app_state LISTA');
  } catch (error) {
    console.error('❌ ERROR AL CREAR TABLA:', error.message);
  }
}

crearTabla();

// ==========================================
// LEER DATOS
// ==========================================

async function readState() {

  try {

    const result = await pool.query(`
      SELECT data
      FROM app_state
      WHERE id = 1
    `);

    if (result.rows.length > 0) {
      return result.rows[0].data;
    }

    return null;

  } catch (error) {

    console.error('Error al leer PostgreSQL:', error);

    return null;

  }
}

// ==========================================
// GUARDAR DATOS
// ==========================================

async function writeState(data) {

  await pool.query(`
    INSERT INTO app_state (
      id,
      data,
      updated_at
    )
    VALUES (
      1,
      $1,
      CURRENT_TIMESTAMP
    )

    ON CONFLICT (id)
    DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = CURRENT_TIMESTAMP
  `, [data]);

}


// ==========================================
// OBTENER TODOS LOS DATOS
// ==========================================
app.get('/api/state', async (req, res) => {
  try {
    const data = await readState();

    res.json({
      ok: true,
      data
    });

  } catch (error) {

    console.error('Error al obtener datos:', error);

    res.status(500).json({
      ok: false,
      error: error.message
    });

  }
});
app.get('/api/test-db', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT NOW() AS fecha,
      current_database() AS base_de_datos
    `);

    res.json({
      ok: true,
      mensaje: 'Conectado correctamente a PostgreSQL 🎉',
      datos: result.rows[0]
    });

  } catch (error) {

    console.error('ERROR COMPLETO POSTGRESQL:');
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: error.message,
      codigo: error.code
    });

  }

});


// ==========================================
// GUARDAR TODOS LOS DATOS
// ==========================================

app.put('/api/state', async (req, res) => {

  try {

    if (
      !req.body ||
      typeof req.body !== 'object'
    ) {

      return res.status(400).json({
        error: 'Datos inválidos'
      });

    }

    await writeState(req.body);

    console.log('Datos guardados correctamente');

    res.json({
      ok: true,
      savedAt: new Date().toISOString(),
      mensaje: 'Datos guardados correctamente'
    });

  } catch (error) {

    console.error('Error al guardar:', error);

    res.status(500).json({
      error: 'No se pudieron guardar los datos'
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

app.listen(PORT, () => {

  console.log(
    `Pits Admin listo en http://localhost:${PORT}`
  );

});