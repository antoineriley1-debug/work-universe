const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
console.log('Looking for:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  console.log('File contents:');
  console.log(content);
}

// Try dotenv
console.log('\nTrying dotenv.config()...');
const result = require('dotenv').config({ path: '.env.local' });
console.log('Result:', result.parsed ? 'Loaded' : 'Not loaded');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);
