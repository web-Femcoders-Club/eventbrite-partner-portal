import { sequelize } from './database';

async function inspectDB() {
  try {
    console.log('--- INSPECCIÓN CRÍTICA DE TABLAS ---');
    
    // Ver estructura de partner_access
    const [structure]: any = await sequelize.query("DESCRIBE partner_access");
    console.log('\nEstructura de partner_access:');
    console.table(structure);

    // Ver registros en partner_access
    const [rows]: any = await sequelize.query("SELECT * FROM partner_access");
    console.log('\nRegistros en partner_access:');
    console.table(rows);

    // Ver si el evento existe en la tabla event
    if (rows.length > 0) {
      const eid = rows[0].eventId || rows[0].event_id || rows[0].EventId;
      console.log(`\nBuscando EventId: "${eid}" en la tabla event...`);
      const [eventRow]: any = await sequelize.query(`SELECT id, name FROM event WHERE id = '${eid}'`);
      if (eventRow.length > 0) {
        console.log(`✅ Evento encontrado: ${eventRow[0].name}`);
      } else {
        console.log(`❌ ERROR: El ID "${eid}" NO EXISTE en la tabla event.`);
        const [anyEvents]: any = await sequelize.query("SELECT id, name FROM event LIMIT 3");
        console.log('IDs válidos en la tabla event:', anyEvents.map((e: any) => e.id));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error inpeccionando:', error);
    process.exit(1);
  }
}

inspectDB();
