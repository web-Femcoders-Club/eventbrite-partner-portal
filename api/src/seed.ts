import { Partner, PartnerAccess } from './database';

async function seed() {
  try {
    console.log('--- 🌱 SEMBRANDO CONFIGURACIÓN INICIAL ---');
    
    // Sincronizar SOLO las tablas nuevas de forma segura
    await Partner.sync();
    await PartnerAccess.sync();
    console.log('✅ Tablas verificadas.');

    // 1. SINCRONIZAR PARTNER: FEMCODERS CLUB (IRINA/ADMIN)
    console.log('Sincronizando Partner FemCoders...');
    let femcoders = await Partner.findOne({ where: { slug: 'femcoders-admin' } });
    if (!femcoders) {
      femcoders = await Partner.create({
        slug: 'femcoders-admin',
        name: 'FemCoders Club (Admin)',
        apiKey: 'admin-femcoders-2024-vip',
        status: 'active'
      });
    } else {
      await femcoders.update({ apiKey: 'admin-femcoders-2024-vip', status: 'active' });
    }

    // 2. SINCRONIZAR PARTNER: INFOJOBS
    console.log('Sincronizando Partner InfoJobs...');
    let infojobs = await Partner.findOne({ where: { slug: 'infojobs' } });
    if (!infojobs) {
      infojobs = await Partner.create({
        slug: 'infojobs',
        name: 'InfoJobs',
        apiKey: 'infojobs-partner-2024',
        status: 'active'
      });
    } else {
      await infojobs.update({ apiKey: 'infojobs-partner-2024', status: 'active' });
    }
    
    // Obtener los IDs finales
    const femcodersId = femcoders.get('id');
    const infojobsId = infojobs.get('id');

    // 3. BUSCAR EL EVENTO "Estructuras en Movimiento"
    const EVENT_ID = '1984505957741'; 
    
    // Le damos acceso a INFOJOBS (Hasta el inicio del 27 de marzo, es decir, el 26 es el último día)
    let accessInfoJobs = await PartnerAccess.findOne({ where: { partnerId: infojobsId, eventId: EVENT_ID } });
    if (!accessInfoJobs) {
      accessInfoJobs = await PartnerAccess.create({
        partnerId: infojobsId,
        eventId: EVENT_ID,
        startDate: new Date('2024-03-01T00:00:00Z'),
        endDate: new Date('2026-03-27T00:00:00Z'), // Acceso termina al empezar el 27
        canDownloadFullData: false 
      });
    } else {
      await accessInfoJobs.update({
        startDate: new Date('2024-03-01T00:00:00Z'),
        endDate: new Date('2026-03-27T00:00:00Z')
      });
    }

    // Le damos acceso a FEMCODERS (Sin límite real)
    let accessFemCoders = await PartnerAccess.findOne({ where: { partnerId: femcodersId, eventId: EVENT_ID } });
    if (!accessFemCoders) {
      accessFemCoders = await PartnerAccess.create({
        partnerId: femcodersId,
        eventId: EVENT_ID,
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2030-12-31T23:59:59Z'), 
        canDownloadFullData: true 
      });
    } else {
      await accessFemCoders.update({
        endDate: new Date('2030-12-31T23:59:59Z'),
        canDownloadFullData: true
      });
    }

    console.log('✅ Configuración completada con éxito.');
    console.log('------------------------------------------');
    console.log('🔑 CÓDIGO FEMCODERS (VIP): admin-femcoders-2024-vip');
    console.log('🔑 CÓDIGO INFOJOBS: infojobs-partner-2024');
    console.log('------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el seed:', error);
    process.exit(1);
  }
}

seed();
