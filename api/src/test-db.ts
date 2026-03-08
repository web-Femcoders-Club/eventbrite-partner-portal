import { sequelize } from './database';

async function testConnection() {
  try {
    console.log('--- TEST DE CONEXIÓN A RAILWAY ---');
    console.log('Intentado conectar con:', process.env.MYSQL_URL ? 'URL detectada ✅' : 'URL NO DETECTADA ❌');
    
    await sequelize.authenticate();
    console.log('1. Conexión establecida con éxito. ✅');

    // Intentamos ver si la tabla event_attendee existe
    const [results] = await sequelize.query("SHOW TABLES LIKE 'event_attendee'");
    
    if (results.length > 0) {
      console.log('2. Tabla "event_attendee" encontrada. ✅');
      
      // Contar cuántos hay para ver si hay datos
      const [count]: any = await sequelize.query("SELECT COUNT(*) as total FROM event_attendee");
      console.log(`3. Total de asistentes detectados: ${count[0].total} registros. ✅`);
    } else {
      console.log('2. Tabla "event_attendee" NO ENCONTRADA. ❌ (Revisa si la DB es la correcta)');
    }

    console.log('--- TEST FINALIZADO ---');
    process.exit(0);
  } catch (error) {
    console.error('ERROR EN EL TEST:', error);
    process.exit(1);
  }
}

testConnection();
