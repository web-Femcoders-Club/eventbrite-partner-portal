import { sequelize, Partner, Event, PartnerAccess } from './database';

async function setupNewEventAccess() {
  const NEW_EVENT_ID = '1984505957741'; // El evento de ayer: "Estructuras en Movimiento"
  
  try {
    console.log('--- CONFIGURANDO ACCESO PARA EL NUEVO EVENTO ---');
    
    // 1. Buscamos al Partner InfoJobs
    const partner = await Partner.findOne({ where: { slug: 'infojobs' } });
    if (!partner) throw new Error('Partner InfoJobs no encontrado. Ejecuta primero setup-test.ts');

    // 2. Buscamos el evento de ayer en tu DB real
    const event = await Event.findByPk(NEW_EVENT_ID);
    if (!event) {
      console.log(`❌ El evento ${NEW_EVENT_ID} no está en tu base de datos.`);
      console.log('Asegurate de haber ejecutado sync-events.ts en tu otro proyecto nestjs.');
      process.exit(1);
    }

    // 3. Le damos acceso desde AYER hasta 1 día después del evento (2026-03-27)
    const startDate = new Date('2026-03-07T00:00:00Z'); // Ayer
    const endDate = new Date('2026-03-27T23:59:59Z'); // 1 día después del evento

    await PartnerAccess.findOrCreate({
      where: { partnerId: partner.get('id'), eventId: event.get('id') },
      defaults: {
        startDate,
        endDate,
        canDownloadFullData: false // DNI Oculto hasta el día 26
      }
    });

    console.log(`✅ Acceso concedido a InfoJobs para: "${event.get('name')}"`);
    console.log(`📅 Periodo: ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}`);
    console.log('\n--- LISTO ---');
    console.log('Ahora InfoJobs puede usar la ruta inteligente:');
    console.log('GET http://localhost:3001/api/partners/active-event');
    console.log('Header: x-api-key: test-key-infojobs-2024');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupNewEventAccess();
