const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection('mysql://root:JkSXkEPKDbLXRdtqxhUEFvmxLjEaLMIi@viaduct.proxy.rlwy.net:45740/railway');
    const [cols] = await conn.query("DESCRIBE event_attendee");
    console.log(JSON.stringify(cols, null, 2));
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
