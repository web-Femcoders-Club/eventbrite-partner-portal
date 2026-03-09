import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.MYSQL_URL || '', {
  dialect: 'mysql',
  logging: false,
});

// 1. Modelo de Socios/Partners (InfoJobs, etc.) - NUEVA
export class Partner extends Model {}
Partner.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true }, 
  apiKey: { type: DataTypes.STRING, unique: true },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
}, { sequelize, modelName: 'partner', tableName: 'partners' });

// 2. Modelo de Eventos - EXISTENTE (Mapeo exacto de tu proyecto NestJS)
export class Event extends Model {}
Event.init({
  id: { type: DataTypes.STRING, primaryKey: true }, 
  name: { type: DataTypes.STRING },
  start_local: { type: DataTypes.STRING },
  location: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT },
  event_url: { type: DataTypes.STRING },
  logo_url: { type: DataTypes.STRING, allowNull: true }
}, { 
  sequelize, 
  modelName: 'Event', 
  tableName: 'event', 
  timestamps: false // No tiene createdAt/updatedAt
});

// 3. Modelo de Asistentes - EXISTENTE (Mapeo exacto)
export class EventAttendee extends Model {}
EventAttendee.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  eventbriteAttendeeId: { type: DataTypes.STRING, unique: true },
  firstName: { type: DataTypes.STRING },
  lastName: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  dni: { type: DataTypes.STRING, allowNull: true },
  eventId: { type: DataTypes.STRING },
  orderFirstName: { type: DataTypes.STRING, allowNull: true },
  orderLastName: { type: DataTypes.STRING, allowNull: true },
  orderEmail: { type: DataTypes.STRING, allowNull: true }
}, { 
  sequelize, 
  modelName: 'EventAttendee', 
  tableName: 'event_attendee', 
  timestamps: false // No tiene createdAt/updatedAt
});

// 4. Tabla de Accesos Temporales - NUEVA
export class PartnerAccess extends Model {}
PartnerAccess.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE, allowNull: false }, 
  canDownloadFullData: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { sequelize, modelName: 'partner_access', tableName: 'partner_access', underscored: false });

// Relaciones
Partner.hasMany(PartnerAccess, { foreignKey: 'partnerId', as: 'accesses' });
PartnerAccess.belongsTo(Partner, { foreignKey: 'partnerId', as: 'partner' });

Event.hasMany(PartnerAccess, { foreignKey: 'eventId', as: 'accesses' });
PartnerAccess.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

Event.hasMany(EventAttendee, { foreignKey: 'eventId' });
EventAttendee.belongsTo(Event, { foreignKey: 'eventId' });

export { sequelize };
