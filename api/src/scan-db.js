const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  try {
    const conn = await mysql.createConnection('mysql://root:JkSXkEPKDbLXRdtqxhUEFvmxLjEaLMIi@viaduct.proxy.rlwy.net:45740/railway');
    const [cols] = await conn.query("DESCRIBE event_attendee");
    const [rows] = await conn.query("SELECT * FROM event_attendee WHERE eventId = '1984505957741' AND firstName = 'Info Requested' LIMIT 5");
    const result = { cols, rows };
    fs.writeFileSync('db-scan.json', JSON.stringify(result, null, 2));
    await conn.end();
    process.exit(0);
  } catch (err) {
    fs.writeFileSync('db-scan-error.txt', err.stack);
    process.exit(1);
  }
}
run();
