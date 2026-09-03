require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000
});
// Archivo donde se guardarán los datos
const STATE_FILE = path.join(__dirname, 'data', 'state.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));


// ==========================================
// LEER DATOS
// ==========================================

function readStateFile() {
  try {
    const data = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {

    console.error('Error al leer state.json:', error);

    return null;
  }
}


// ==========================================
// GUARDAR DATOS
// ==========================================

function writeStateFile(data) {

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(data, null, 2),
    'utf8'
  );

}


// ==========================================
// OBTENER TODOS LOS DATOS
// ==========================================

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

app.put('/api/state', (req, res) => {

  try {

    if (
      !req.body ||
      typeof req.body !== 'object'
    ) {

      return res.status(400).json({
        error: 'Datos inválidos'
      });

    }

    writeStateFile(req.body);

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
// PRUEBA DEL SERVIDOR
// ==========================================

app.get('/api/test-db', (req, res) => {

  res.json({
    ok: true,
    mensaje: 'Servidor funcionando correctamente 🎉'
  });

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