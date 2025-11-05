/**
 * scenarioCalculations.js
 * Utility functies voor scenario data processing en berekeningen
 */

/**
 * Bereken gemiddelde waarden voor een set buurten uit de strategie matrix
 */
export const berekenGemiddeldes = (buurten, strategieKolom = 'Referentie_2030') => {
  if (!buurten || buurten.length === 0) return {};
  
  const sommen = {};
  let validCount = 0;
  
  buurten.forEach(buurt => {
    const matrix = buurt.strategieMatrix;
    if (!matrix) return;
    
    Object.keys(matrix).forEach(indicator => {
      const waarde = matrix[indicator]?.[strategieKolom];
      
      if (typeof waarde === 'number' && !isNaN(waarde)) {
        if (!sommen[indicator]) {
          sommen[indicator] = { totaal: 0, count: 0 };
        }
        sommen[indicator].totaal += waarde;
        sommen[indicator].count++;
      }
    });
    validCount++;
  });
  
  const gemiddeldes = {};
  Object.keys(sommen).forEach(indicator => {
    gemiddeldes[indicator] = sommen[indicator].totaal / sommen[indicator].count;
  });
  
  return gemiddeldes;
};

/**
 * Haal strategie data op voor meerdere buurten
 */
export const getStrategieData = (buurten, strategieKolom) => {
  const gemiddeldes = berekenGemiddeldes(buurten, strategieKolom);
  
  return {
    kolom: strategieKolom,
    gemiddeldes,
    aantalBuurten: buurten.length
  };
};

/**
 * Bereken CO2 reductie percentage t.o.v. baseline
 */
export const berekenCO2Reductie = (strategieData, baselineData) => {
  const strategieCO2 = strategieData?.gemiddeldes?.H15_CO2_uitstoot || 0;
  const baselineCO2 = baselineData?.gemiddeldes?.H15_CO2_uitstoot || 1;
  
  if (baselineCO2 === 0) return 0;
  
  return ((baselineCO2 - strategieCO2) / baselineCO2) * 100;
};

/**
 * Bereken kosten per ton CO2 besparing
 */
export const berekenKostenPerTonCO2 = (strategieData) => {
  return strategieData?.gemiddeldes?.H17_Nat_meerkost_CO2 || 0;
};

/**
 * Haal alle beschikbare strategiekolommen op uit parsed data
 */
export const getAvailableStrategies = (parsedData) => {
  if (!parsedData?.strategieKolommen) return [];
  
  return parsedData.strategieKolommen;
};

/**
 * Filter strategiekolommen op basis van criteria
 */
export const filterStrategies = (kolommen, filters = {}) => {
  if (!kolommen || kolommen.length === 0) return [];
  
  return kolommen.filter(kolom => {
    // Filter op strategie type (S1, S2, S3, S4)
    if (filters.strategieType) {
      const strategieCode = getStrategieCodeFromKolom(kolom);
      if (strategieCode !== filters.strategieType) return false;
    }
    
    // Filter op schillabel (B+ of D+)
    if (filters.schillabel) {
      if (filters.schillabel === 'B+' && kolom.includes('_D_')) return false;
      if (filters.schillabel === 'D+' && kolom.includes('_B_')) return false;
    }
    
    // Filter op brontype (bijv. alleen WKO, Geo, etc)
    if (filters.brontype) {
      if (!kolom.toLowerCase().includes(filters.brontype.toLowerCase())) return false;
    }
    
    return true;
  });
};

/**
 * Haal strategie code op uit kolomnaam (S1, S2, S3, S4)
 */
export const getStrategieCodeFromKolom = (kolom) => {
  if (kolom.startsWith('Strategie_1') || kolom.startsWith('Variant_s1')) return 'S1';
  if (kolom.startsWith('Strategie_2') || kolom.startsWith('Variant_s2')) return 'S2';
  if (kolom.startsWith('Strategie_3') || kolom.startsWith('Variant_s3')) return 'S3';
  if (kolom.startsWith('Strategie_4') || kolom.startsWith('Variant_s4')) return 'S4';
  return null;
};

/**
 * Krijg friendly label voor strategie kolom
 */
export const getStrategieLabelFromKolom = (kolom) => {
  // Referenties
  if (kolom === 'Referentie_2023') return 'Referentie 2023';
  if (kolom === 'Referentie_2030') return 'Referentie 2030';
  if (kolom.includes('LN_0BCM') || kolom === 'Laagste_Nationale_Kosten') return 'Laagste Nationale Kosten';
  
  // Strategieën
  if (kolom === 'Strategie_1') return 'S1: All-Electric (Lucht-WP B+)';
  if (kolom === 'Strategie_2') return 'S2: Warmtenet MT (Restwarmte B+)';
  if (kolom === 'Strategie_3') return 'S3: Warmtenet LT/ZLT (WKO B+)';
  if (kolom === 'Strategie_4') return 'S4: Klimaatneutraal Gas (Hybride B+)';
  
  // Varianten - All Electric
  if (kolom === 'Variant_s1a_B_LuchtWP') return 'S1a: Lucht-WP B+';
  if (kolom === 'Variant_s1b_B_BodemWP') return 'S1b: Bodem-WP B+';
  
  // Varianten - Warmtenet MT
  if (kolom === 'Variant_s2a_B_Restwarmte') return 'S2a: MT Restwarmte B+';
  if (kolom === 'Variant_s2b_B_Geo_contour') return 'S2b: MT Geo (contour) B+';
  if (kolom === 'Variant_s2c_B_Geo_overal') return 'S2c: MT Geo (overal) B+';
  if (kolom === 'Variant_s2d_D_Restwarmte') return 'S2d: MT Restwarmte D+';
  if (kolom === 'Variant_s2e_D_Geo_contour') return 'S2e: MT Geo (contour) D+';
  if (kolom === 'Variant_s2f_D_Geo_overal') return 'S2f: MT Geo (overal) D+';
  
  // Varianten - Warmtenet LT/ZLT
  if (kolom === 'Variant_s3a_B_LT30_30') return 'S3a: LT 15-30°C ind. opw. B+';
  if (kolom === 'Variant_s3b_B_WKO15_15') return 'S3b: WKO 15°C ind. opw. B+';
  if (kolom === 'Variant_s3c_B_WKO15_70') return 'S3c: WKO 15°C coll. 70°C B+';
  if (kolom === 'Variant_s3d_B_WKO15_50') return 'S3d: WKO 15°C coll. 50°C B+';
  if (kolom === 'Variant_s3e_B_TEO_15_15') return 'S3e: WKO+TEO ind. opw. B+';
  if (kolom === 'Variant_s3f_D_LT30_70') return 'S3f: LT 30°C coll. 70°C D+';
  if (kolom === 'Variant_s3g_D_WKO15_15') return 'S3g: WKO 15°C ind. opw. D+';
  if (kolom === 'Variant_s3h_D_WKO15_70') return 'S3h: WKO+TEO coll. 70°C D+';
  
  // BuurtWKO supplementair
  if (kolom.includes('BuurtWKO')) {
    const base = kolom.replace('Supplementair_', '').replace('_BuurtWKO', '');
    return getStrategieLabelFromKolom(`Variant_${base}`) + ' (Buurt-WKO)';
  }
  
  // Varianten - Klimaatneutraal Gas
  if (kolom === 'Variant_s4a_KG_B_hWP') return 'S4a: Hybride WP B+';
  if (kolom === 'Variant_s4b_KG_D_hWP') return 'S4b: Hybride WP D+';
  
  // Fallback
  return kolom.replace(/_/g, ' ');
};

/**
 * Krijg kleur voor strategie
 */
export const getStrategieColor = (strategieCode) => {
  const colors = {
    'S1': '#3b82f6', // Blauw - All Electric
    'S2': '#ef4444', // Rood - Warmtenet MT
    'S3': '#f59e0b', // Oranje - Warmtenet LT
    'S4': '#10b981', // Groen - Klimaatneutraal Gas
    'REF': '#6b7280', // Grijs - Referentie
    'LNK': '#8b5cf6'  // Paars - Laagste Nationale Kosten
  };
  
  return colors[strategieCode] || '#83AF9A';
};

/**
 * Krijg icon voor strategie
 */
export const getStrategieIcon = (strategieCode) => {
  const icons = {
    'S1': '⚡',
    'S2': '♨️',
    'S3': '🌡️',
    'S4': '🔥',
    'REF': '📊',
    'LNK': '💰'
  };
  
  return icons[strategieCode] || '📌';
};

/**
 * Sort strategieën voor display (referenties eerst, dan S1-S4)
 */
export const sortStrategiesForDisplay = (kolommen) => {
  const order = {
    'Referentie_2023': 0,
    'Referentie_2030': 1,
    'LN_0BCM_combined.csv': 2,
    'Laagste_Nationale_Kosten': 2,
    'Strategie_1': 3,
    'Strategie_2': 4,
    'Strategie_3': 5,
    'Strategie_4': 6
  };
  
  return [...kolommen].sort((a, b) => {
    const orderA = order[a] ?? 999;
    const orderB = order[b] ?? 999;
    
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
};

/**
 * Format getal naar Nederlands formaat
 */
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Format bedrag in euro's
 */
export const formatEuro = (amount, compact = false) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '€ -';
  
  if (compact) {
    if (Math.abs(amount) >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1000) {
      return `€${(amount / 1000).toFixed(0)}k`;
    }
  }
  
  return `€${formatNumber(amount, 0)}`;
};

/**
 * Groepeer varianten per hoofdstrategie
 */
export const groupVariantsByStrategy = (kolommen) => {
  const grouped = {
    S1: [],
    S2: [],
    S3: [],
    S4: [],
    REF: [],
    LNK: []
  };
  
  kolommen.forEach(kolom => {
    const code = getStrategieCodeFromKolom(kolom);
    
    if (kolom.includes('Referentie')) {
      grouped.REF.push(kolom);
    } else if (kolom.includes('LN_0BCM') || kolom.includes('Laagste_Nationale_Kosten')) {
      grouped.LNK.push(kolom);
    } else if (code) {
      grouped[code].push(kolom);
    }
  });
  
  return grouped;
};