const { execSync } = require('child_process');
try {
  console.log('Starting install...');
  const out = execSync('npm install jspdf jspdf-autotable xlsx --no-fund --no-audit', { stdio: 'pipe' });
  console.log('Output:', out.toString());
} catch (e) {
  console.error('Error:', e.message);
  if (e.stdout) console.log('Stdout:', e.stdout.toString());
  if (e.stderr) console.log('Stderr:', e.stderr.toString());
}
