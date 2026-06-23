#!/usr/bin/env node

/**
 * Paystub Generator - Setup Validation Script
 * Verifies all components are correctly configured
 */

const fs = require('fs');
const path = require('path');

const checks = [];
const errors = [];
const warnings = [];

function check(name, fn) {
  try {
    fn();
    checks.push(`✓ ${name}`);
  } catch (error) {
    errors.push(`✗ ${name}: ${error.message}`);
  }
}

function warn(name, message) {
  warnings.push(`⚠ ${name}: ${message}`);
}

console.log('\n📋 Validating Paystub Generator Setup...\n');

// 1. Check file structure
console.log('1️⃣  Checking File Structure...');

check('package.json exists', () => {
  if (!fs.existsSync('./package.json')) throw new Error('Not found');
});

const requiredDirs = [
  'pages',
  'pages/api',
  'pages/api/paystub',
  'pages/api/employee',
  'components',
  'lib',
  'styles',
  'tests'
];

requiredDirs.forEach(dir => {
  check(`Directory: ${dir}`, () => {
    if (!fs.existsSync(dir)) throw new Error('Not found');
  });
});

const requiredFiles = [
  'pages/index.js',
  'pages/_app.js',
  'pages/api/paystub/calculate.js',
  'pages/api/paystub/history.js',
  'pages/api/employee/index.js',
  'components/PaystubForm.jsx',
  'components/PaystubPreview.jsx',
  'lib/supabase.js',
  'lib/taxCalculator.js',
  'lib/pdfGenerator.js',
  'styles/globals.css',
  'next.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'README.md',
  'SKILL.md',
  'QUICKSTART.md'
];

requiredFiles.forEach(file => {
  check(`File: ${file}`, () => {
    if (!fs.existsSync(file)) throw new Error('Not found');
  });
});

// 2. Check package.json dependencies
console.log('\n2️⃣  Checking Dependencies...');

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const requiredDeps = [
  'next',
  'react',
  'react-dom',
  '@supabase/supabase-js',
  'jspdf',
  'html2canvas',
  'date-fns'
];

requiredDeps.forEach(dep => {
  check(`Dependency: ${dep}`, () => {
    if (!pkg.dependencies[dep]) throw new Error('Not listed in dependencies');
  });
});

// 3. Check environment variables
console.log('\n3️⃣  Checking Environment Variables...');

const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const env = fs.readFileSync(envFile, 'utf8');
  check('NEXT_PUBLIC_SUPABASE_URL set', () => {
    if (!env.includes('NEXT_PUBLIC_SUPABASE_URL')) throw new Error('Not found');
  });
  check('NEXT_PUBLIC_SUPABASE_ANON_KEY set', () => {
    if (!env.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) throw new Error('Not found');
  });
} else {
  warn('.env.local', 'Create from .env.example and add Supabase credentials');
}

// 4. Validate JavaScript syntax
console.log('\n4️⃣  Validating Code...');

const jsFiles = [
  'pages/index.js',
  'pages/api/paystub/calculate.js',
  'lib/taxCalculator.js'
];

jsFiles.forEach(file => {
  check(`JavaScript syntax: ${file}`, () => {
    const content = fs.readFileSync(file, 'utf8');
    try {
      new Function(content);
    } catch (e) {
      throw new Error(`Syntax error: ${e.message}`);
    }
  });
});

// 5. Validate tax calculator exports
console.log('\n5️⃣  Validating Tax Calculator...');

check('Tax calculator has required exports', () => {
  const content = fs.readFileSync('./lib/taxCalculator.js', 'utf8');
  const requiredFuncs = [
    'calculateGrossPay',
    'calculateFederalTax',
    'calculateStateTax',
    'calculateSocialSecurity',
    'calculateMedicare',
    'calculateCompletePaystub'
  ];
  
  requiredFuncs.forEach(func => {
    if (!content.includes(`export function ${func}`)) {
      throw new Error(`Missing function: ${func}`);
    }
  });
});

// 6. Validate Supabase setup
console.log('\n6️⃣  Validating Supabase Configuration...');

check('Supabase client configured', () => {
  const content = fs.readFileSync('./lib/supabase.js', 'utf8');
  if (!content.includes('createClient')) throw new Error('Client not created');
  if (!content.includes('schemaSQL')) throw new Error('Schema SQL not defined');
});

// 7. Validate API endpoints
console.log('\n7️⃣  Validating API Endpoints...');

check('Employee API handler exists', () => {
  const content = fs.readFileSync('./pages/api/employee/index.js', 'utf8');
  if (!content.includes('handler')) throw new Error('Handler not found');
});

check('Paystub calculate handler exists', () => {
  const content = fs.readFileSync('./pages/api/paystub/calculate.js', 'utf8');
  if (!content.includes('handler')) throw new Error('Handler not found');
});

check('Paystub history handler exists', () => {
  const content = fs.readFileSync('./pages/api/paystub/history.js', 'utf8');
  if (!content.includes('handler')) throw new Error('Handler not found');
});

// 8. Validate React components
console.log('\n8️⃣  Validating React Components...');

check('PaystubForm component exports default', () => {
  const content = fs.readFileSync('./components/PaystubForm.jsx', 'utf8');
  if (!content.includes('export default function PaystubForm')) {
    throw new Error('Default export not found');
  }
});

check('PaystubPreview component exports default', () => {
  const content = fs.readFileSync('./components/PaystubPreview.jsx', 'utf8');
  if (!content.includes('export default function PaystubPreview')) {
    throw new Error('Default export not found');
  }
});

// 9. Validate configuration files
console.log('\n9️⃣  Validating Configuration Files...');

check('Next.js config valid', () => {
  const config = require('./next.config.js');
  if (typeof config !== 'object') throw new Error('Config not exported');
});

check('Tailwind config valid', () => {
  const config = require('./tailwind.config.js');
  if (!config.content) throw new Error('Content not configured');
});

// 10. Validate documentation
console.log('\n🔟 Validating Documentation...');

check('README.md has content', () => {
  const content = fs.readFileSync('./README.md', 'utf8');
  if (content.length < 500) throw new Error('Content too short');
});

check('SKILL.md has API documentation', () => {
  const content = fs.readFileSync('./SKILL.md', 'utf8');
  if (!content.includes('API')) throw new Error('Missing API docs');
  if (!content.includes('POST')) throw new Error('Missing endpoint docs');
});

check('QUICKSTART.md has setup instructions', () => {
  const content = fs.readFileSync('./QUICKSTART.md', 'utf8');
  if (!content.includes('npm install')) throw new Error('Missing setup steps');
  if (!content.includes('Supabase')) throw new Error('Missing Supabase setup');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION RESULTS');
console.log('='.repeat(60) + '\n');

if (checks.length > 0) {
  console.log(`✅ PASSED (${checks.length}):`);
  checks.forEach(c => console.log(`  ${c}`));
  console.log();
}

if (warnings.length > 0) {
  console.log(`⚠️  WARNINGS (${warnings.length}):`);
  warnings.forEach(w => console.log(`  ${w}`));
  console.log();
}

if (errors.length > 0) {
  console.log(`❌ FAILED (${errors.length}):`);
  errors.forEach(e => console.log(`  ${e}`));
  console.log();
}

// Final status
console.log('='.repeat(60));
if (errors.length === 0) {
  console.log('✅ All validations passed! Ready for deployment.\n');
  process.exit(0);
} else {
  console.log(`❌ ${errors.length} validation(s) failed. Fix above issues.\n`);
  process.exit(1);
}
