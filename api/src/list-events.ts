import { sequelize } from './database';

async function listEvents() {
  try {
    console.log('--- BUSCANDO LOS 5 EVENTOS MÁS RECIENTES ---');
    const [events]: any = await sequelize.query("SELECT id, name, start_local FROM event ORDER BY start_local DESC LIMIT 5");
    
    if (events.length > 0) {
      events.forEach((ev: any) => {
        console.log(`ID: ${ev.id} | Nombre: ${ev.name} | Fecha: ${ev.start_local}`);
      });
      console.log('\n--- FIN DE LA LISTA ---');
    } else {
      console.log('No se encontraron eventos en la tabla "event".');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error al listar eventos:', error);
    process.exit(1);
  }
}

listEvents();
