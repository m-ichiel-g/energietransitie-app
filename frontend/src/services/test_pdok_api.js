#!/usr/bin/env node

/**
 * Test script voor PDOK CBS Wijken en Buurten 2024 WFS API (FIXED)
 * 
 * Dit script test de WFS service met CQL filtering
 * 
 * Gebruik: node test_pdok_wfs.js
 */

const https = require('https');

const PDOK_BASE = 'service.pdok.nl';
const WFS_PATH = '/cbs/wijkenbuurten/2024/wfs/v1_0';

// Test codes
const TEST_CODES = {
  gemeente: 'GM0363',      // Amsterdam
  wijk: 'WK036300',        // Een wijk in Amsterdam
  buurt: 'BU03630000'      // Een buurt in deze wijk
};

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: PDOK_BASE,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, parseError: true });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testWFS() {
  log('\n' + '='.repeat(60), 'bright');
  log('PDOK CBS Wijken en Buurten 2024 WFS Test (FIXED)', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  // Test 1: WFS GetCapabilities
  log('Test 1: WFS Service Beschikbaar', 'cyan');
  try {
    const params = 'service=WFS&version=2.0.0&request=GetCapabilities';
    const result = await makeRequest(`${WFS_PATH}?${params}`);
    
    if (result.status === 200) {
      log('✓ WFS service is bereikbaar', 'green');
    } else {
      log(`✗ WFS service error: ${result.status}`, 'red');
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
  }

  // Test 2: Gemeente met CQL filter
  log('\nTest 2: Gemeente Geometrie (WFS + CQL)', 'cyan');
  log(`  Code: ${TEST_CODES.gemeente}`, 'blue');
  try {
    const params = `service=WFS&version=2.0.0&request=GetFeature&typeName=gemeenten&outputFormat=application/json&cql_filter=statcode='${TEST_CODES.gemeente}'`;
    const result = await makeRequest(`${WFS_PATH}?${params}`);
    
    if (result.status === 200 && !result.parseError && result.data.features?.length > 0) {
      const feature = result.data.features[0];
      log('✓ Gemeente gevonden', 'green');
      log(`  Naam: ${feature.properties.statnaam}`, 'blue');
      log(`  Statcode: ${feature.properties.statcode}`, 'blue');
      log(`  Geometrie type: ${feature.geometry.type}`, 'blue');
      log(`  Features count: ${result.data.features.length}`, 'blue');
    } else {
      log(`✗ Geen gemeente gevonden (status: ${result.status})`, 'red');
      if (result.parseError) {
        log('  Response was niet JSON (mogelijk XML)', 'yellow');
      }
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
  }

  // Test 3: Wijk met CQL filter
  log('\nTest 3: Wijk Geometrie (WFS + CQL)', 'cyan');
  log(`  Code: ${TEST_CODES.wijk}`, 'blue');
  try {
    const params = `service=WFS&version=2.0.0&request=GetFeature&typeName=wijken&outputFormat=application/json&cql_filter=statcode='${TEST_CODES.wijk}'`;
    const result = await makeRequest(`${WFS_PATH}?${params}`);
    
    if (result.status === 200 && !result.parseError && result.data.features?.length > 0) {
      const feature = result.data.features[0];
      log('✓ Wijk gevonden', 'green');
      log(`  Naam: ${feature.properties.statnaam}`, 'blue');
      log(`  Statcode: ${feature.properties.statcode}`, 'blue');
      log(`  Geometrie type: ${feature.geometry.type}`, 'blue');
    } else {
      log(`✗ Geen wijk gevonden (status: ${result.status})`, 'red');
      if (result.parseError) {
        log('  Response was niet JSON (mogelijk XML)', 'yellow');
      }
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
  }

  // Test 4: Buurt met CQL filter
  log('\nTest 4: Buurt Geometrie (WFS + CQL)', 'cyan');
  log(`  Code: ${TEST_CODES.buurt}`, 'blue');
  try {
    const params = `service=WFS&version=2.0.0&request=GetFeature&typeName=buurten&outputFormat=application/json&cql_filter=statcode='${TEST_CODES.buurt}'`;
    const result = await makeRequest(`${WFS_PATH}?${params}`);
    
    if (result.status === 200 && !result.parseError && result.data.features?.length > 0) {
      const feature = result.data.features[0];
      log('✓ Buurt gevonden', 'green');
      log(`  Naam: ${feature.properties.statnaam}`, 'blue');
      log(`  Statcode: ${feature.properties.statcode}`, 'blue');
      log(`  Geometrie type: ${feature.geometry.type}`, 'blue');
    } else {
      log(`✗ Geen buurt gevonden (status: ${result.status})`, 'red');
      if (result.parseError) {
        log('  Response was niet JSON (mogelijk XML)', 'yellow');
      }
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
  }

  // Test 5: Batch request (meerdere buurten tegelijk)
  log('\nTest 5: Batch Request (IN operator)', 'cyan');
  try {
    const codes = ['BU03630000', 'BU03630001', 'BU03630002'];
    const codeList = codes.map(c => `'${c}'`).join(',');
    const params = `service=WFS&version=2.0.0&request=GetFeature&typeName=buurten&outputFormat=application/json&cql_filter=statcode IN (${codeList})`;
    const result = await makeRequest(`${WFS_PATH}?${params}`);
    
    if (result.status === 200 && !result.parseError && result.data.features) {
      log(`✓ Batch request succesvol: ${result.data.features.length} buurten gevonden`, 'green');
      result.data.features.forEach(f => {
        log(`  - ${f.properties.statnaam} (${f.properties.statcode})`, 'blue');
      });
    } else {
      log(`✗ Batch request mislukt (status: ${result.status})`, 'red');
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
  }

  // Test 6: LIKE operator (alle wijken in gemeente)
  log('\nTest 6: LIKE operator (alle wijken in gemeente)', 'cyan');
  try {
    const gemNum = TEST_CODES.gemeente.substring(2); // 0363
    const params = `service=WFS&version=2.0.0&request=GetFeature&typeName=wijken&outputFormat=application/json&cql_filter=statcode LIKE 'WK${gemNum}%'&count=5`;
    const result = await makeRequest(`${WFS_PATH}?${params}`);
    
    if (result.status === 200 && !result.parseError && result.data.features) {
      log(`✓ LIKE query succesvol: ${result.data.features.length} wijken gevonden`, 'green');
      result.data.features.forEach(f => {
        log(`  - ${f.properties.statnaam} (${f.properties.statcode})`, 'blue');
      });
    } else {
      log(`✗ LIKE query mislukt (status: ${result.status})`, 'red');
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
  }

  // Samenvatting
  log('\n' + '='.repeat(60), 'bright');
  log('Test Voltooid', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  log('Belangrijke URLs:', 'cyan');
  log('WFS Base: https://service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0', 'blue');
  log('Gebruik: cql_filter parameter voor filtering', 'blue');
  log('Format: outputFormat=application/json', 'blue');
  
  log('\nExample request:', 'cyan');
  log('https://service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0?', 'blue');
  log('  service=WFS&version=2.0.0&request=GetFeature', 'blue');
  log('  &typeName=gemeenten', 'blue');
  log('  &outputFormat=application/json', 'blue');
  log(`  &cql_filter=statcode='GM0363'`, 'blue');
}

// Run tests
testWFS().catch(error => {
  log(`\nFatale error: ${error.message}`, 'red');
  process.exit(1);
});