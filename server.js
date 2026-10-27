const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mongoose = require('mongoose');

// String de conexão atualizada com a nova palavra-passe (leotom123)
const MONGO_URI = 'mongodb://leotom:leotom123@ac-cd1b6gl-shard-00-00.g7v1u4s.mongodb.net:27017,ac-cd1b6gl-shard-00-01.g7v1u4s.mongodb.net:27017,ac-cd1b6gl-shard-00-02.g7v1u4s.mongodb.net:27017/?ssl=true&replicaSet=atlas-iuo2p3-shard-0&authSource=admin';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas com sucesso!'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err.message));

const uvSchema = new mongoose.Schema({
  rawReading: Number,
  voltage: Number,
  status: { type: String, default: 'OK' },
  timestamp: { type: Date, default: Date.now }
});

const UvData = mongoose.model('UvData', uvSchema);

// IMPORTANTE: Mantenha 'COM3' (ou a porta correta onde o seu ESP32 está)
const port = new SerialPort({ 
  path: 'COM3', 
  baudRate: 9600 
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

port.on('error', (err) => {
  console.error('Erro na porta serial:', err.message);
});

parser.on('data', async (data) => {
  console.log(`Recebido do ESP32: ${data}`);
  
  try {
    if (!data.includes('Leitura:') || !data.includes('Tensao:')) return;

    const parts = data.split('|');
    const raw = parseInt(parts[0].replace('Leitura:', '').trim());
    const volt = parseFloat(parts[1].replace('Tensao:', '').replace('V', '').trim());

    if (isNaN(raw) || isNaN(volt)) return;

    let statusSensor = raw === 0 ? 'ZERO_READING' : 'OK';

    const novoRegistro = new UvData({ 
      rawReading: raw, 
      voltage: volt,
      status: statusSensor
    });

    await novoRegistro.save();
    console.log('-> Salvo no MongoDB com sucesso!');

  } catch (error) {
    console.error('Erro ao salvar no banco:', error.message);
  }
});