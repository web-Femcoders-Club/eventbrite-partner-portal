import { PartnerAccess, Event, Partner } from './database';

async function debugAccess() {
  try {
    console.log('--- DEPURANDO ACCESOS Y RELACIONES ---');
    
    const accesses = await PartnerAccess.findAll({
      include: [
        { model: Event },
        { model: Partner }
      ]
    });

    console.log(`Total de registros en partner_access: ${accesses.length}`);
    
    accesses.forEach((a: any, index) => {
      const json = a.toJSON();
      console.log(`\nAcceso #${index + 1}:`);
      console.log(`- ID: ${json.id}`);
      console.log(`- PartnerId: ${json.partnerId}`);
      console.log(`- EventId: ${json.eventId}`);
      console.log(`- Objeto Partner: ${json.partner ? json.partner.name : 'NO ENCONTRADO'}`);
      console.log(`- Objeto Event: ${json.Event ? json.Event.name : (json.event ? json.event.name : 'NO ENCONTRADO')}`);
      
      if (!json.Event && !json.event) {
        console.log('  ⚠️ ADVERTENCIA: Este acceso apunta a un EventId que no existe en la tabla "event".');
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('Error en depuración:', error);
    process.exit(1);
  }
}

debugAccess();
