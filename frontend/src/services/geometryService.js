/**
 * Geometry Service - PDOK CBS Wijken en Buurten 2024 WFS
 * DEFINITIEVE VERSIE met correcte property namen!
 * 
 * Property namen in de API:
 * - Gemeenten: gemeentecode (niet statcode!)
 * - Wijken: wijkcode
 * - Buurten: buurtcode
 */

const PDOK_WFS_BASE = 'https://service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0';

/**
 * Bouw een OGC filter XML
 */
function buildOGCFilter(propertyName, value) {
  return `<Filter><PropertyIsEqualTo><PropertyName>${propertyName}</PropertyName><Literal>${value}</Literal></PropertyIsEqualTo></Filter>`;
}

/**
 * Haal gemeente geometrie op basis van GM-code
 */
export async function fetchGemeenteGeometry(gemCode) {
  try {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'gemeenten',
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',  // BELANGRIJK: Vraag WGS84 coördinaten!
      count: '1'
    });
    
    // BELANGRIJK: gebruik 'gemeentecode' niet 'statcode'!
    const filter = buildOGCFilter('gemeentecode', gemCode);
    
    const url = `${PDOK_WFS_BASE}?${params}&filter=${encodeURIComponent(filter)}`;
    console.log('📍 Fetching gemeente geometrie:', gemCode);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      console.log('✅ Gemeente geometrie gevonden:', gemCode);
      console.log('   Naam:', data.features[0].properties?.gemeentenaam);
      return data.features[0];
    }
    
    console.warn('⚠️ Geen gemeente gevonden voor:', gemCode);
    return null;
  } catch (error) {
    console.error('❌ Error fetching gemeente:', error);
    return null;
  }
}

/**
 * Haal wijk geometrie op basis van WK-code
 */
export async function fetchWijkGeometry(wijkCode) {
  try {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'wijken',
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',  // BELANGRIJK: Vraag WGS84 coördinaten!
      count: '1'
    });
    
    // BELANGRIJK: gebruik 'wijkcode' niet 'statcode'!
    const filter = buildOGCFilter('wijkcode', wijkCode);
    const url = `${PDOK_WFS_BASE}?${params}&filter=${encodeURIComponent(filter)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching wijk:', error);
    return null;
  }
}

/**
 * Haal buurt geometrie op basis van BU-code
 */
export async function fetchBuurtGeometry(buurtCode) {
  try {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'buurten',
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',  // BELANGRIJK: Vraag WGS84 coördinaten!
      count: '1'
    });
    
    // BELANGRIJK: gebruik 'buurtcode' niet 'statcode'!
    const filter = buildOGCFilter('buurtcode', buurtCode);
    const url = `${PDOK_WFS_BASE}?${params}&filter=${encodeURIComponent(filter)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching buurt:', error);
    return null;
  }
}

/**
 * Haal meerdere buurten tegelijk op
 */
export async function fetchBuurtenBatch(buurtCodes) {
  if (buurtCodes.length === 0) return {};
  
  const results = {};
  
  // Parallel requests (max 10 tegelijk)
  const batchSize = 10;
  for (let i = 0; i < buurtCodes.length; i += batchSize) {
    const batch = buurtCodes.slice(i, i + batchSize);
    
    const promises = batch.map(async (code) => {
      const feature = await fetchBuurtGeometry(code);
      if (feature) {
        results[code] = feature;
      }
    });
    
    await Promise.all(promises);
  }
  
  return results;
}

/**
 * Bereken bounds voor een geometry
 */
export function calculateBounds(geometry) {
  if (!geometry) return null;
  
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  const processCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      minLon = Math.min(minLon, coords[0]);
      maxLon = Math.max(maxLon, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
    } else {
      coords.forEach(processCoords);
    }
  };
  
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(processCoords);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => polygon.forEach(processCoords));
  }
  
  if (minLat === Infinity) return null;
  
  return [[minLat, minLon], [maxLat, maxLon]];
}

/**
 * Bereken het centrum van bounds
 */
export function boundsCenter(bounds) {
  if (!bounds) return null;
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2
  ];
}

/**
 * Haal gemeente code op basis van buurt/wijk code
 */
export function getGemeenteCodeFromCode(code) {
  if (code.startsWith('BU') || code.startsWith('WK')) {
    const gemeenteNummer = code.substring(2, 6);
    return `GM${gemeenteNummer}`;
  }
  
  return null;
}

/**
 * Cache voor geometrie data
 */
const geometryCache = {
  gemeenten: {},
  wijken: {},
  buurten: {}
};

export function getCachedGeometry(type, code) {
  return geometryCache[`${type}n`]?.[code] || null;
}

export function cacheGeometry(type, code, feature) {
  if (!geometryCache[`${type}n`]) {
    geometryCache[`${type}n`] = {};
  }
  geometryCache[`${type}n`][code] = feature;
}

export function clearGeometryCache() {
  geometryCache.gemeenten = {};
  geometryCache.wijken = {};
  geometryCache.buurten = {};
}

/**
 * Laad alle benodigde geometrie
 */
export async function loadAllGeometry({ gemeenteCode, wijkCodes = [], buurtCodes = [] }) {
  console.log('📦 Laden geometrie...', { 
    gemeenteCode, 
    wijkCodes: wijkCodes.length, 
    buurtCodes: buurtCodes.length 
  });
  
  const result = {
    gemeente: null,
    wijken: {},
    buurten: {}
  };
  
  // 1. Laad gemeente
  if (gemeenteCode) {
    const cached = getCachedGeometry('gemeente', gemeenteCode);
    if (cached) {
      result.gemeente = cached;
      console.log('✅ Gemeente uit cache');
    } else {
      const feature = await fetchGemeenteGeometry(gemeenteCode);
      if (feature) {
        cacheGeometry('gemeente', gemeenteCode, feature);
        result.gemeente = feature;
      }
    }
  }
  
  // 2. Laad wijken (parallel)
  if (wijkCodes.length > 0) {
    console.log(`🔄 Laden ${wijkCodes.length} wijken...`);
    const wijkPromises = wijkCodes.map(async (code) => {
      const cached = getCachedGeometry('wijk', code);
      if (cached) {
        result.wijken[code] = cached;
      } else {
        const feature = await fetchWijkGeometry(code);
        if (feature) {
          cacheGeometry('wijk', code, feature);
          result.wijken[code] = feature;
        }
      }
    });
    
    await Promise.all(wijkPromises);
    console.log(`✅ ${Object.keys(result.wijken).length}/${wijkCodes.length} wijken geladen`);
  }
  
  // 3. Laad buurten (in batches)
  if (buurtCodes.length > 0) {
    console.log(`🔄 Laden ${buurtCodes.length} buurten...`);
    
    const uncachedCodes = buurtCodes.filter(code => !getCachedGeometry('buurt', code));
    const cachedCount = buurtCodes.length - uncachedCodes.length;
    
    buurtCodes.forEach(code => {
      const cached = getCachedGeometry('buurt', code);
      if (cached) {
        result.buurten[code] = cached;
      }
    });
    
    if (cachedCount > 0) {
      console.log(`✅ ${cachedCount} buurten uit cache`);
    }
    
    if (uncachedCodes.length > 0) {
      const batchResults = await fetchBuurtenBatch(uncachedCodes);
      Object.entries(batchResults).forEach(([code, feature]) => {
        cacheGeometry('buurt', code, feature);
        result.buurten[code] = feature;
      });
      console.log(`✅ ${Object.keys(batchResults).length}/${uncachedCodes.length} nieuwe buurten geladen`);
    }
    
    console.log(`✅ Totaal: ${Object.keys(result.buurten).length}/${buurtCodes.length} buurten beschikbaar`);
  }
  
  console.log('✅ Geometrie laden voltooid:', {
    gemeente: result.gemeente ? '✓' : '✗',
    wijken: Object.keys(result.wijken).length,
    buurten: Object.keys(result.buurten).length
  });
  
  return result;
}