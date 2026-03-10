const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  let conn;
  try {
    const url = process.env.MYSQL_URL || 'mysql://root:JkSXkEPKDbLXRdtqxhUEFvmxLjEaLMIi@viaduct.proxy.rlwy.net:45740/railway';
    conn = await mysql.createConnection(url);
    
    try {
      await conn.query("ALTER TABLE event_attendee ADD COLUMN brevoNotified BOOLEAN DEFAULT FALSE");
    } catch (e) {
      if (e.code !== 'ER_DUP_COLUMN_NAME') throw e;
    }

    try {
      await conn.query("ALTER TABLE event_attendee ADD COLUMN brevoNotifiedAt DATETIME NULL");
    } catch (e) {
      if (e.code !== 'ER_DUP_COLUMN_NAME') throw e;
    }

    process.exit(0);
  } catch (err) {
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}
run();
