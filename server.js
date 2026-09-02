const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'data', 'state.json');

app.use(express.json({limit:'10mb'}));
app.use(express.static(__dirname));

function readState(){
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}
function writeState(data){
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, STATE_FILE);
}

app.get('/api/state', (req,res)=>{
  try { res.json(readState()); }
  catch(err){ console.error(err); res.status(500).json({error:'No se pudo leer la base de datos'}); }
});

app.put('/api/state', (req,res)=>{
  try {
    if(!req.body || typeof req.body !== 'object') return res.status(400).json({error:'Datos inválidos'});
    writeState(req.body);
    res.json({ok:true, savedAt:new Date().toISOString()});
  } catch(err){ console.error(err); res.status(500).json({error:'No se pudo guardar'}); }
});

app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT, ()=>console.log(`Pits Admin listo en http://localhost:${PORT}`));
