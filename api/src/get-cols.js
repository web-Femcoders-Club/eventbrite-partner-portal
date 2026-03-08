const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  try {
    const conn = await mysql.createConnection('mysql://root:JkSXkEPKDbLXRdtqxhUEFvmxLjEaLMIi@viaduct.proxy.rlwy.net:45740/railway');
    const [cols] = await conn.query("DESCRIBE event_attendee");
    fs.writeFileSync('cols.json', JSON.stringify(cols, null, 2));
    await conn.end();
    process.exit(0);
  } catch (err) {
    fs.writeFileSync('error.txt', err.stack);
    process.exit(1);
  }
}
run();
