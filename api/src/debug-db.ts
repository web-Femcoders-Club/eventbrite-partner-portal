import { Partner, PartnerAccess, Event } from './database';

async function debug() {
  try {
    const partners = await Partner.findAll();
    console.log('--- PARTNERS ---');
    partners.forEach(p => console.log(`Slug: ${p.get('slug')}, API Key: ${p.get('apiKey')}, ID: ${p.get('id')}`));

    const accesses = await PartnerAccess.findAll({ include: [{ model: Event, as: 'event' }] });
    console.log('\n--- ACCESOS ---');
    accesses.forEach(a => {
      const access = a.toJSON() as any;
      console.log(`Partner ID: ${access.partnerId}, Event: ${access.event?.name || access.eventId}, Start: ${access.startDate}, End: ${access.endDate}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error debugging:', error);
    process.exit(1);
  }
}
debug();
