const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection('mysql://root:JkSXkEPKDbLXRdtqxhUEFvmxLjEaLMIi@viaduct.proxy.rlwy.net:45740/railway');
    const [rows] = await conn.query("SELECT email, firstName, lastName, dni FROM event_attendee WHERE eventId = '1984505957741'");
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
