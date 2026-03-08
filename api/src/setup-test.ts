import { sequelize, Partner, Event, PartnerAccess } from './database';

async function setupTestData() {
  try {
    console.log('--- CONFIGURANDO DATOS DE PRUEBA SEGUROS ---');
    
    // 1. Sincronizar SOLO las nuevas tablas (Sin tocar tus tablas reales)
    await Partner.sync({ alter: true });
    await PartnerAccess.sync({ alter: true });
    console.log('Tablas de Partners y Accesos listas. ✅ (Tus tablas de NestJS no se han tocado)');

    // 2. Crear al Partner: InfoJobs
    const [infojobs] = await Partner.findOrCreate({
      where: { slug: 'infojobs' },
      defaults: {
        name: 'InfoJobs',
        apiKey: 'test-key-infojobs-2024',
        status: 'active'
      }
    });
    console.log(`Partner "InfoJobs" listo. ID: ${infojobs.get('id')} ✅`);

    // 3. Buscar un Evento REAL de tu base de datos (para ver los 1501 asistentes)
    const [realEvent]: any = await sequelize.query("SELECT id, name FROM event LIMIT 1");
    
    if (realEvent.length > 0) {
      const eventId = realEvent[0].id;
      const eventName = realEvent[0].name;
      console.log(`Evento real detectado: "${eventName}" (ID: ${eventId}) ✅`);

      // 4. Crear el Acceso Temporal para este evento real
      // Acceso hoy con DNI oculto (canDownloadFullData: false)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await PartnerAccess.findOrCreate({
        where: { partnerId: infojobs.get('id'), eventId: eventId },
        defaults: {
          startDate: new Date(),
          endDate: tomorrow,
          canDownloadFullData: false 
        }
      });
      console.log(`Acceso temporal de InfoJobs activado para el evento: ${eventName} ✅`);
      
      console.log('\n--- DATOS LISTOS PARA PROBAR ---');
      console.log(`URL de prueba: http://localhost:3001/api/partners/registrations/${eventId}`);
      console.log('Header requerido: x-api-key: test-key-infojobs-2024');
    } else {
      console.log('No se encontraron eventos en la tabla "event". Asegúrate de haber sincronizado el otro proyecto.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error configurando datos:', error);
    process.exit(1);
  }
}

setupTestData();
