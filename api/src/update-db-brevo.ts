
import { sequelize } from './database';

async function updateSchema() {
  try {
    console.log('--- ACTUALIZANDO ESQUEMA PARA BREVO ---');
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('event_attendee');

    if (!tableInfo.brevoNotified) {
      console.log('Añadiendo columna brevoNotified...');
      await queryInterface.addColumn('event_attendee', 'brevoNotified', {
        type: 'BOOLEAN',
        defaultValue: false
      });
    }

    if (!tableInfo.brevoNotifiedAt) {
      console.log('Añadiendo columna brevoNotifiedAt...');
      await queryInterface.addColumn('event_attendee', 'brevoNotifiedAt', {
        type: 'DATETIME',
        allowNull: true
      });
    }

    console.log('✅ Base de datos actualizada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error actualizando la base de datos:', error);
    process.exit(1);
  }
}

updateSchema();
