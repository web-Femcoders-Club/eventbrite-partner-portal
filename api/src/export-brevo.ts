import { EventAttendee, Event } from './database';
import fs from 'fs';
import path from 'path';

async function generateBrevoCSV() {
  try {
    console.log('--- GENERANDO LISTA PARA BREVO (DESPISTADOS SIN DNI) ---');

    // 1. Buscamos el evento activo más reciente (o el que estamos tratando)
    const latestEvent = await Event.findOne({ order: [['start_local', 'DESC']] });
    
    if (!latestEvent) {
      console.log('No se encontraron eventos.');
      process.exit(1);
    }

    const eventId = latestEvent.get('id');
    const eventName = latestEvent.get('name');
    console.log(`Evento: ${eventName} (ID: ${eventId})`);

    // 2. Buscamos asistentes que NO tengan DNI (null, vacío o "Info Requested")
    const missingDNIAttendees = await EventAttendee.findAll({
      where: {
        eventId: eventId
      }
    });

    // Filtramos manualmente para ser más precisos con los casos de Eventbrite
    const toNotify = missingDNIAttendees.filter((a: any) => {
      const data = a.toJSON();
      return !data.dni || data.dni.trim() === '' || data.firstName === 'Info Requested';
    });

    if (toNotify.length === 0) {
      console.log('¡Increíble! Todos los asistentes tienen su DNI al día. ✅');
      process.exit(0);
    }

    // 3. Crear el contenido CSV
    const csvHeader = 'email,firstName,lastName,eventName\n';
    const csvRows = toNotify.map((a: any) => {
      const data = a.toJSON();
      // Limpiamos comas para no romper el CSV
      const email = data.email || '';
      const fName = data.firstName === 'Info Requested' ? '' : data.firstName;
      const lName = data.lastName === 'Info Requested' ? '' : data.lastName;
      return `${email},${fName},${lName},"${eventName}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // 4. Guardar archivo
    const fileName = `contactos_sin_dni_${eventId}.csv`;
    const filePath = path.join(__dirname, '..', fileName);
    fs.writeFileSync(filePath, csvContent);

    console.log(`\n✅ ¡Lista generada con éxito!`);
    console.log(`📊 Total personas a notificar: ${toNotify.length}`);
    console.log(`📂 Archivo creado: ${fileName}`);
    console.log(`\n💡 INSTRUCCIONES PARA BREVO:`);
    console.log(`1. Ve a Brevo -> Contactos -> Importar contactos.`);
    console.log(`2. Sube el archivo ${fileName}.`);
    console.log(`3. Crea una campaña de email dirigida a esta lista pidiendo el DNI.`);

    process.exit(0);
  } catch (error) {
    console.error('Error generando CSV:', error);
    process.exit(1);
  }
}

generateBrevoCSV();
