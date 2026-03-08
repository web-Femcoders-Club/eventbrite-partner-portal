import { sequelize } from './database';

async function debugPendientes() {
  try {
    const eventId = '1984505957741';
    console.log(`--- ANALIZANDO REGISTROS 'Info Requested' DEL EVENTO ${eventId} ---`);
    
    const [rows]: any = await sequelize.query(`
      SELECT firstName, lastName, email, dni, eventbriteAttendeeId
      FROM event_attendee 
      WHERE eventId = '${eventId}' 
      AND firstName = 'Info Requested'
    `);
    
    console.log(`Encontrados ${rows.length} registros:`);
    console.table(rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugPendientes();
