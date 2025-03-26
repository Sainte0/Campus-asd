import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.production') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = 'campus';

async function cleanDatabase() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(MONGODB_DB);

  try {
    // Eliminar las colecciones que contienen datos de Eventbrite
    await db.collection('studentCommissions').deleteMany({});
    await db.collection('users').deleteMany({ role: 'student' });

    console.log('✅ Base de datos limpiada correctamente');
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error);
  } finally {
    await client.close();
  }
}

cleanDatabase(); 