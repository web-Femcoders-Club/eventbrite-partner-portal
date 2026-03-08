const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const logFile = 'db-check.log';
  fs.writeFileSync(logFile, 'Iniciando script...\n');
  try {
    const conn = await mysql.createConnection('mysql://root:JkSXkEPKDbLXRdtqxhUEFvmxLjEaLMIi@viaduct.proxy.rlwy.net:45740/railway');
    fs.appendFileSync(logFile, 'Conexión establecida.\n');
    const [cols] = await conn.query("DESCRIBE event_attendee");
    fs.appendFileSync(logFile, 'Columnas obtenidas.\n');
    fs.writeFileSync('db-columns.json', JSON.stringify(cols, null, 2));
    await conn.end();
    fs.appendFileSync(logFile, 'Script finalizado con éxito.\n');
    process.exit(0);
  } catch (err) {
    fs.appendFileSync(logFile, `ERROR: ${err.message}\n${err.stack}\n`);
    process.exit(1);
  }
}
run();
