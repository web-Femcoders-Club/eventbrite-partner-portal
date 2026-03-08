import { sequelize } from './database';

async function inspectAttendees() {
  try {
    const eventId = '1984505957741';
    console.log(`--- INSPECCIÓN DE ASISTENTES EVENTO ${eventId} ---`);
    
    const [rows]: any = await sequelize.query(`
      SELECT firstName, lastName, email, dni 
      FROM event_attendee 
      WHERE eventId = '${eventId}' 
      AND (firstName = 'Info Requested' OR email = 'Info Requested')
    `);
    
    console.log('\nTickets "Info Requested":');
    console.table(rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectAttendees();
