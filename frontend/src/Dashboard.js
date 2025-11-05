import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ScenarioCalculator from './ScenarioCalculator';

export default function Dashboard({ 
  cbsData, 
  selectedGemeenten, 
  selectedWijken, 
  selectedBuurten,
  gemeenteData,
  getGebiedNaam,
  loadingData,
  onClose, 
  onPBLDataChange   
}) {

  // ✅ STAP 1: Alle useState hooks
  const [activeTab, setActiveTab] = useState('gebiedsinformatie');
  const [detailData, setDetailData] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedStats, setExpandedStats] = useState({});
  const [mainView, setMainView] = useState('data');
  const [pblData, setPblData] = useState(null);

  // ✅ STAP 2: Constanten
  const dataTabs = [
    { id: 'gebiedsinformatie', label: '📍 Gebiedsinformatie', icon: '📍' },
    { id: 'woningvoorraad', label: '🏘️ Woningvoorraad', icon: '🏘️' },
    { id: 'utiliteit', label: '🏢 Utiliteit', icon: '🏢' },
    { id: 'energievraag', label: '⚡ Energievraag', icon: '⚡' },
    { id: 'aansluitingen', label: '🔌 Aansluitingen', icon: '🔌' },
  ];

  const CBS_MEASURES = {
    AANTAL_WONINGEN: 'M000297',
    AARDGAS_VERBRUIK: 'M000219_2',
    STADSVERWARMING_PCT: 'M000369',
    ZONNESTROOM_PCT: 'M008297',
    CORPORATIE_BEZIT: 'A047047',
    AARDGAS_WONINGEN_PCT: 'M008296',
    ELEKTRISCH_VERWARMD_PCT: 'M008298',
    EENGEZINSWONING_PCT: 'ZW10290',
    MEERGEZINSWONING_PCT: 'ZW10340',
    HUURWONINGEN_PCT: '1014850_2',
    KOOPWONINGEN_PCT: '1014800'
  };

  // ✅ STAP 3: Functies
  const handlePBLDataParsed = (data) => {
    console.log('🎯 handlePBLDataParsed aangeroepen met data:', data);
    console.log('🎯 Data heeft buurten:', data?.buurten ? Object.keys(data.buurten).length : 'geen');
    setPblData(data);
    console.log('✅ PBL data opgeslagen in Dashboard:', data?.metadata);
  };

  // ✅ STAP 4: useEffect hooks (allemaal op hetzelfde niveau!)
  
  // Monitor pblData updates
  useEffect(() => {
    console.log('📊 Dashboard pblData updated:', pblData);
    if (pblData) {
      console.log('  - Aantal buurten:', Object.keys(pblData.buurten || {}).length);
      console.log('  - Strategiekolommen:', pblData.strategieKolommen?.length);
    }
  }, [pblData]);

  // Monitor selectedBuurten
  useEffect(() => {
    console.log('🎯 Dashboard - pblData:', pblData ? 'beschikbaar' : 'niet beschikbaar');
    console.log('🎯 Dashboard - selectedBuurten:', selectedBuurten);
  }, [pblData, selectedBuurten]);

  // Fetch detail data when selection changes
  useEffect(() => {
    const allCodes = [...selectedGemeenten, ...selectedWijken, ...selectedBuurten];
    if (allCodes.length === 0) {
      setDetailData({});
      return;
    }


    const timer = setTimeout(() => {
      fetchAllCBSDetails(allCodes);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedGemeenten, selectedWijken, selectedBuurten]);

  const fetchAllCBSDetails = async (codes) => {
    setLoadingDetails(true);
    const tableId = '85984NED';
    
    const measuresToFetch = [
      CBS_MEASURES.AARDGAS_VERBRUIK,
      CBS_MEASURES.STADSVERWARMING_PCT,
      CBS_MEASURES.ZONNESTROOM_PCT,
      CBS_MEASURES.CORPORATIE_BEZIT,
      CBS_MEASURES.AARDGAS_WONINGEN_PCT,
      CBS_MEASURES.ELEKTRISCH_VERWARMD_PCT,
      CBS_MEASURES.EENGEZINSWONING_PCT,
      CBS_MEASURES.MEERGEZINSWONING_PCT,
      CBS_MEASURES.HUURWONINGEN_PCT,
      CBS_MEASURES.KOOPWONINGEN_PCT
    ];

    try {
      const allData = {};

      for (const code of codes) {
        allData[code] = {};
        
        for (const measureId of measuresToFetch) {
          try {
            const url = `https://datasets.cbs.nl/odata/v1/CBS/${tableId}/Observations?$filter=WijkenEnBuurten eq '${code}' and Measure eq '${measureId}'&$select=WijkenEnBuurten,Measure,Value`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.value && data.value.length > 0) {
              allData[code][measureId] = parseFloat(data.value[0]?.Value || 0);
            }
          } catch (err) {
            console.error(`Fout bij ophalen ${measureId} voor ${code}:`, err);
          }
        }
      }

      setDetailData(allData);
      setLoadingDetails(false);
    } catch (error) {
      console.error('Fout bij laden CBS details:', error);
      setLoadingDetails(false);
    }
  };

  const getAverageForBuurten = (measureId) => {
    const buurtValues = selectedBuurten
      .map(code => detailData[code]?.[measureId])
      .filter(val => val !== undefined && val !== null && !isNaN(val));
    
    if (buurtValues.length === 0) return null;
    return buurtValues.reduce((a, b) => a + b, 0) / buurtValues.length;
  };

  const getTotalForBuurten = (measureId) => {
    const buurtValues = selectedBuurten
      .map(code => detailData[code]?.[measureId])
      .filter(val => val !== undefined && val !== null && !isNaN(val));
    
    if (buurtValues.length === 0) return null;
    return buurtValues.reduce((a, b) => a + b, 0);
  };

const getPBLDataForBuurt = (buurtCode) => {
  if (!pblData || !pblData[buurtCode]) return null;
  return pblData[buurtCode];
};

const getAggregatedPBLData = (field) => {
  if (!pblData) return null;
  
  let total = 0;
  let count = 0;
  
  selectedBuurten.forEach(buurtCode => {
    const buurtData = pblData[buurtCode]?.totaal;
    if (buurtData && buurtData[field] !== undefined && buurtData[field] !== null) {
      total += parseFloat(buurtData[field]) || 0;
      count++;
    }
  });
  
  return count > 0 ? total / count : null;
};

  const toggleStatExpand = (statKey) => {
    setExpandedStats(prev => ({
      ...prev,
      [statKey]: !prev[statKey]
    }));
  };

  const totaalBuurten = Object.values(cbsData)
    .filter(d => d.type === 'buurt')
    .reduce((sum, d) => sum + d.aantalWoningen, 0);

  const aantalBuurten = selectedBuurten.length;

  const renderOverzicht = () => (
    <div className="space-y-4">
      {selectedGemeenten.map(gemCode => {
        const gemeente = gemeenteData[gemCode];
        const gemeenteInfo = cbsData[gemCode];
        
        return (
          <div key={gemCode} className="border-2 rounded-xl overflow-hidden shadow-lg transition-all duration-300" style={{ 
            borderColor: '#83AF9A',
            background: '#F3F3E2'
          }}>
            <div className="p-3" style={{ background: 'rgba(131, 175, 154, 0.2)' }}>
              <h3 className="font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                📍 {gemeente?.naam}
              </h3>
              {gemeenteInfo && (
                <p className="text-sm mt-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  🏘️ {gemeenteInfo.aantalWoningen.toLocaleString('nl-NL')} woningen
                </p>
              )}
            </div>
            
            <div className="p-3 space-y-3" style={{ background: 'white' }}>
              {selectedWijken
                .filter(wc => wc.startsWith('WK' + gemCode.replace('GM', '')))
                .map(wijkCode => {
                  const wijkInfo = cbsData[wijkCode];
                  const wijkNaam = getGebiedNaam(wijkCode);
                  
                  return (
                    <div key={wijkCode} className="border-l-4 pl-3" style={{ borderColor: '#83AF9A' }}>
                      <h4 className="font-semibold text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                        {wijkNaam}
                      </h4>
                      {wijkInfo && (
                        <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                          🏘️ {wijkInfo.aantalWoningen.toLocaleString('nl-NL')} woningen
                        </p>
                      )}
                      
                      <div className="mt-2 space-y-2">
                        {selectedBuurten
                          .filter(bc => bc.startsWith('BU' + wijkCode.replace('WK', '')))
                          .map(buurtCode => {
                            const buurtInfo = cbsData[buurtCode];
                            const buurtNaam = getGebiedNaam(buurtCode);
                            
                            return (
                              <div key={buurtCode} className="border-l-4 pl-3 ml-3" style={{ borderColor: '#6f9884' }}>
                                <h5 className="font-medium text-xs" style={{ color: '#374151', fontFamily: 'Raleway, sans-serif' }}>
                                  {buurtNaam}
                                </h5>
                                {buurtInfo && (
                                  <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                                    🏘️ {buurtInfo.aantalWoningen.toLocaleString('nl-NL')} woningen
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}

{/* Databron indicator */}
{pblData && Object.keys(pblData).length > 0 && (
  <div className="px-4 py-2 border-b" style={{ 
    background: 'rgba(131, 175, 154, 0.1)',
    borderColor: '#F3F3E2'
  }}>
    <p className="text-xs" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
      📦 Databron: PBL Startanalyse ({Object.keys(pblData).length} buurten) + CBS (aanvullend)
    </p>
  </div>
)}

      <div className="p-4 rounded-xl border-2 shadow-lg" style={{ 
        background: '#F3F3E2',
        borderColor: '#83AF9A'
      }}>
        <p className="text-sm font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          Totaal geselecteerde buurten
        </p>
        <p className="text-3xl font-bold my-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          {totaalBuurten.toLocaleString('nl-NL')}
        </p>
        <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          woningen in {aantalBuurten} buurten
        </p>
      </div>
    </div>
  );

// DEBUG FUNCTIE - tijdelijk
const debugPBLData = () => {
  if (!pblData || selectedBuurten.length === 0) return;
  
  const eersteCode = selectedBuurten[0];
  const buurtData = pblData[eersteCode];
  
  console.log('🔍 DEBUG - Eerste buurt:', eersteCode);
  console.log('📦 Totaal data:', buurtData?.totaal);
  console.log('📊 Strategie data:', buurtData?.strategie);
  console.log('🎯 StrategieMatrix keys:', buurtData?.strategieMatrix ? Object.keys(buurtData.strategieMatrix) : 'GEEN');
  
  if (buurtData?.strategieMatrix?.Referentie_2023) {
    console.log('✅ Referentie_2023 data:', buurtData.strategieMatrix.Referentie_2023);
    console.log('   A01_Aansl_aardgas:', buurtData.strategieMatrix.Referentie_2023.A01_Aansl_aardgas);
    console.log('   H01_Vraag_totaal:', buurtData.strategieMatrix.Referentie_2023.H01_Vraag_totaal);
  } else {
    console.log('❌ Geen Referentie_2023 gevonden!');
  }
  
  console.log('🏢 Utiliteit aantal:', buurtData?.totaal?.I10_aantal_utiliteit);
  console.log('🏢 Kantoor:', buurtData?.totaal?.Kantoor);
};

// ===== NIEUWE DATA TAB FUNCTIES =====

const renderGebiedsinformatie = () => {
  debugPBLData(); // DEBUG - t
  if (!pblData || selectedBuurten.length === 0) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Upload PBL data en selecteer buurten om informatie te zien
        </p>
      </div>
    );
  }

  // Aggregeer data
  let totaalWoningen = 0;
  let totaalUtiliteit = 0;
  let totaalWEQ = 0;
  let totaalCO2 = 0;
  let totaalNieuwbouw = 0;

  selectedBuurten.forEach(code => {
    const data = pblData[code]?.totaal || pblData[code]?.strategie;
    if (data) {
      totaalWoningen += parseFloat(data.I09_aantal_woningen) || 0;
      totaalUtiliteit += parseFloat(data.I10_aantal_utiliteit) || 0;
      totaalWEQ += parseFloat(data.I11_woningequivalenten) || 0;
      totaalCO2 += parseFloat(data.I12_CO2_startjaar) || 0;
      totaalNieuwbouw += parseFloat(data.I25_aantal_woningen_na2019) || 0;
    }
  });

  // Verzamel unieke gebiedsinfo
  const gebiedsInfo = selectedBuurten.map(code => {
    const data = pblData[code]?.totaal || pblData[code]?.strategie;
    return {
      buurtcode: code,
      buurtnaam: data?.I02_buurtnaam || getGebiedNaam(code),
      wijknaam: data?.I04_wijknaam || '',
      gemeentenaam: data?.I06_gemeentenaam || '',
      energieregio: data?.I07_energieregionaam || '',
      provincie: data?.I08_provincienaam || ''
    };
  });

  const gemeente = gebiedsInfo[0]?.gemeentenaam || '';
  const provincie = gebiedsInfo[0]?.provincie || '';
  const energieregio = gebiedsInfo[0]?.energieregio || '';

  return (
    <div className="space-y-4">
      {/* 1.1 Algemene Gegevens */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          1.1 Algemene Buurtgegevens
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Gemeente</p>
            <p className="font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>{gemeente}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Provincie</p>
            <p className="font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>{provincie}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Energieregio</p>
            <p className="font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>{energieregio}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Aantal buurten</p>
            <p className="font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>{selectedBuurten.length}</p>
          </div>
        </div>
      </div>

      {/* 1.2 Kerncijfers */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          1.2 Woningen & Utiliteit - Kerncijfers
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Aantal woningen</p>
            <p className="text-2xl font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
              {Math.round(totaalWoningen).toLocaleString('nl-NL')}
            </p>
            <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>aansluitingen</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Aantal utiliteit</p>
            <p className="text-2xl font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
              {Math.round(totaalUtiliteit).toLocaleString('nl-NL')}
            </p>
            <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>aansluitingen</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Woningequivalenten</p>
            <p className="text-2xl font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
              {Math.round(totaalWEQ).toLocaleString('nl-NL')}
            </p>
            <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>WEQ</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>CO₂ startjaar</p>
            <p className="text-2xl font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
              {Math.round(totaalCO2).toLocaleString('nl-NL')}
            </p>
            <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>mega gram/jaar</p>
          </div>
        </div>
        
        {totaalNieuwbouw > 0 && (
          <div className="mt-3 p-3 rounded-lg" style={{ background: 'white' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Nieuwbouw na 2019</p>
            <p className="text-lg font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
              {Math.round(totaalNieuwbouw).toLocaleString('nl-NL')} woningen
            </p>
          </div>
        )}
      </div>

      {/* Buurtoverzicht */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          Geselecteerde Buurten
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {gebiedsInfo.map((info, idx) => (
            <div key={idx} className="p-2 rounded-lg border" style={{ borderColor: '#F3F3E2', background: '#FFFFF4' }}>
              <p className="text-sm font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                {info.buurtnaam}
              </p>
              <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                {info.wijknaam} • {info.buurtcode}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const renderWoningvoorraad = () => {
  if (!pblData || selectedBuurten.length === 0) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Upload PBL data en selecteer buurten om woningvoorraad te zien
        </p>
      </div>
    );
  }

  // Aggregeer bouwperiodes
  const bouwperiodes = {
    'Voor_1930': 0, '1930_1945': 0, '1946_1965': 0, '1966_1975': 0,
    '1976_1992': 0, '1993_1996': 0, '1997_2000': 0, '2001_2006': 0,
    '2007_2011': 0, '2012_2014': 0, '2015_2020': 0
  };

  // Aggregeer energielabels
  const energielabels = {
    'Label A en beter': 0, 'Label B': 0, 'Label C': 0, 'Label D': 0,
    'Label E': 0, 'Label F': 0, 'Label G': 0, 'Geen label': 0
  };

  // Aggregeer woningtypen
  const woningtypen = {
    'Vrijstaande_woning': 0, '2_onder_1_kap': 0, 'Rijwoning_hoek': 0,
    'Rijwoning_tussen': 0, 'Meersgezinswoning_laag_midden': 0, 'Meersgezinswoning_hoog': 0
  };

  selectedBuurten.forEach(code => {
    const data = pblData[code]?.totaal;
    if (data) {
      // Bouwperiodes
      Object.keys(bouwperiodes).forEach(periode => {
        bouwperiodes[periode] += parseFloat(data[periode]) || 0;
      });

      // Labels - let op spaties in kolomnamen!
      energielabels['Label A en beter'] += parseFloat(data['Label A en beter'] || data['Label_A_en_beter']) || 0;
      energielabels['Label B'] += parseFloat(data['Label B'] || data['Label_B']) || 0;
      energielabels['Label C'] += parseFloat(data['Label C'] || data['Label_C']) || 0;
      energielabels['Label D'] += parseFloat(data['Label D'] || data['Label_D']) || 0;
      energielabels['Label E'] += parseFloat(data['Label E'] || data['Label_E']) || 0;
      energielabels['Label F'] += parseFloat(data['Label F'] || data['Label_F']) || 0;
      energielabels['Label G'] += parseFloat(data['Label G'] || data['Label_G']) || 0;
      energielabels['Geen label'] += parseFloat(data['Geen label'] || data['Geen_label']) || 0;

      // Woningtypen
      Object.keys(woningtypen).forEach(type => {
        woningtypen[type] += parseFloat(data[type]) || 0;
      });
    }
  });

  const totaalWoningen = Object.values(woningtypen).reduce((a, b) => a + b, 0);
  const totaalLabels = Object.values(energielabels).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* 2.1 Bouwperiode */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          2.1 Woningen naar Bouwperiode
        </h3>
        <div className="space-y-2">
          {Object.entries(bouwperiodes).map(([periode, aantal]) => {
            const pct = totaalWoningen > 0 ? (aantal / totaalWoningen * 100) : 0;
            if (aantal === 0) return null;
            return (
              <div key={periode} className="p-3 rounded-lg" style={{ background: 'white' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {periode.replace('_', '-')}
                  </span>
                  <div className="text-right">
                    <span className="font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
                      {Math.round(aantal).toLocaleString('nl-NL')}
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: '#83AF9A' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2.2 Energielabel */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          2.2 Woningen naar Energielabel
        </h3>
        <div className="space-y-2">
          {Object.entries(energielabels).map(([label, aantal]) => {
            const pct = totaalLabels > 0 ? (aantal / totaalLabels * 100) : 0;
            const labelKleur = label.includes('A') || label.includes('B') ? '#22c55e' : 
                              label.includes('C') || label.includes('D') ? '#f59e0b' : '#ef4444';
            if (aantal === 0) return null;
            return (
              <div key={label} className="p-3 rounded-lg" style={{ background: 'white' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {label}
                  </span>
                  <div className="text-right">
                    <span className="font-bold" style={{ color: labelKleur, fontFamily: 'Raleway, sans-serif' }}>
                      {Math.round(aantal).toLocaleString('nl-NL')}
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: labelKleur }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2.3 Woningtypen */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          2.3 Woningen naar Type
        </h3>
        <div className="space-y-2">
          {Object.entries(woningtypen).map(([type, aantal]) => {
            const pct = totaalWoningen > 0 ? (aantal / totaalWoningen * 100) : 0;
            const typeLabel = type.replace(/_/g, ' ').replace('2 onder 1 kap', '2-onder-1-kap');
            if (aantal === 0) return null;
            return (
              <div key={type} className="p-3 rounded-lg" style={{ background: 'white' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {typeLabel}
                  </span>
                  <div className="text-right">
                    <span className="font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
                      {Math.round(aantal).toLocaleString('nl-NL')}
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: '#83AF9A' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const renderUtiliteit = () => {
  if (!pblData || selectedBuurten.length === 0) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Upload PBL data en selecteer buurten om utiliteit te zien
        </p>
      </div>
    );
  }

  // Aggregeer utiliteitstypen
  const utilTypes = {
    'Kantoor': 0, 'Winkel': 0, 'Zorg': 0, 'Logies': 0, 'Onderwijs': 0,
    'Industrie': 0, 'Bijeenkomst': 0, 'Sport': 0, 'Cellen': 0, 'Overige_gebruiksfuncties': 0
  };

  // Aggregeer bouwperiodes utiliteit
  const utilBouwperiodes = {
    'Voor_1920': 0, '1975_1990': 0, '1990_1995': 0, '1995_2000': 0, 'Na_1995': 0
  };

  let totaalUtil = 0;

  selectedBuurten.forEach(code => {
    const data = pblData[code]?.totaal;
    if (data) {
      totaalUtil += parseFloat(data.I10_aantal_utiliteit) || 0;
      
      // Utiliteitstypen
      Object.keys(utilTypes).forEach(type => {
        utilTypes[type] += parseFloat(data[type]) || 0;
      });
      
      // Bouwperiodes (deze staan vaak in bebouwing CSV, maar probeer eerst totaal)
      Object.keys(utilBouwperiodes).forEach(periode => {
        const value = parseFloat(data[periode]) || 0;
        utilBouwperiodes[periode] += value;
      });
    }
  });

  return (
    <div className="space-y-4">
      {/* 3.3 Utiliteit naar Type */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          3.3 Utiliteit naar Type
        </h3>
        
        <div className="mb-4 p-3 rounded-lg" style={{ background: 'white' }}>
          <p className="text-sm mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Totaal utiliteit</p>
          <p className="text-2xl font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
            {Math.round(totaalUtil).toLocaleString('nl-NL')}
          </p>
          <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>aansluitingen</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(utilTypes)
            .filter(([_, aantal]) => aantal > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([type, aantal]) => (
              <div key={type} className="p-3 rounded-lg" style={{ background: 'white' }}>
                <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                  {type.replace(/_/g, ' ')}
                </p>
                <p className="text-lg font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  {Math.round(aantal).toLocaleString('nl-NL')} m² BVO
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* 3.1 Utiliteit naar Bouwperiode */}
      {Object.values(utilBouwperiodes).some(v => v > 0) && (
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
          borderColor: '#83AF9A'
        }}>
          <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            3.1 Utiliteit naar Bouwperiode
          </h3>
          <div className="space-y-2">
            {Object.entries(utilBouwperiodes)
              .filter(([_, aantal]) => aantal > 0)
              .map(([periode, aantal]) => {
                const totaal = Object.values(utilBouwperiodes).reduce((a, b) => a + b, 0);
                const pct = totaal > 0 ? (aantal / totaal * 100) : 0;
                return (
                  <div key={periode} className="p-3 rounded-lg" style={{ background: 'white' }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                        {periode.replace('_', ' ')}
                      </span>
                      <div className="text-right">
                        <span className="font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
                          {Math.round(aantal).toLocaleString('nl-NL')}
                        </span>
                        <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                          ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: '#83AF9A' }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

const renderEnergievraag = () => {
  if (!pblData || selectedBuurten.length === 0) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Upload PBL data en selecteer buurten om energievraag te zien
        </p>
      </div>
    );
  }

  // Aggregeer energievraag vanuit strategieMatrix
  let vraagTotaal = 0, vraagRV = 0, vraagTW = 0, vraagVent = 0, vraagK = 0, vraagApp = 0;
  let inputTotaal = 0, inputAardgas = 0, inputElektriciteit = 0, inputMT = 0, inputLT = 0;
  let co2Totaal = 0;
  let aantalBuurten = 0;

  selectedBuurten.forEach(code => {
  
    const referentie = pblData[code]?.strategieMatrix?.Referentie_2023;
    if (referentie) {
      aantalBuurten++;
      vraagTotaal += parseFloat(referentie.H01_Vraag_totaal) || 0;
      vraagRV += parseFloat(referentie.H02_Vraag_RV) || 0;
      vraagTW += parseFloat(referentie.H03_Vraag_TW) || 0;
      vraagVent += parseFloat(referentie.H04_Vraag_Vent) || 0;
      vraagK += parseFloat(referentie.H05_Vraag_K) || 0;
      vraagApp += parseFloat(referentie.H06_Vraag_App) || 0;
      
      inputTotaal += parseFloat(referentie.H08_Input_totaal) || 0;
      inputAardgas += parseFloat(referentie.H09_Input_aardgas) || 0;
      inputElektriciteit += parseFloat(referentie.H11_Input_elektriciteit) || 0;
      inputMT += parseFloat(referentie.H12_input_MTwarmtebronnen) || 0;
      inputLT += parseFloat(referentie.H13_input_LTwarmtebronnen) || 0;
      
      co2Totaal += parseFloat(referentie.H15_CO2_uitstoot) || 0;
    }
  });

  // Bereken gemiddeldes per WEQ
  const gemVraagTotaal = aantalBuurten > 0 ? vraagTotaal / aantalBuurten : 0;
  const gemInputTotaal = aantalBuurten > 0 ? inputTotaal / aantalBuurten : 0;

  return (
    <div className="space-y-4">
      {/* 4.1 Energievraag per Toepassing */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          4.1 Energievraag per Toepassing
        </h3>
        
        <div className="mb-4 p-3 rounded-lg" style={{ background: 'white' }}>
          <p className="text-sm mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Totale energievraag (gem.)</p>
          <p className="text-2xl font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
            {gemVraagTotaal.toFixed(1)} GJ/WEQ/jaar
          </p>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Ruimteverwarming (RV)', waarde: vraagRV, key: 'RV' },
            { label: 'Tapwater (TW)', waarde: vraagTW, key: 'TW' },
            { label: 'Ventilatie', waarde: vraagVent, key: 'Vent' },
            { label: 'Koeling', waarde: vraagK, key: 'K' },
            { label: 'Apparaten', waarde: vraagApp, key: 'App' }
          ].map(item => {
            const gemiddeld = aantalBuurten > 0 ? item.waarde / aantalBuurten : 0;
            const pct = vraagTotaal > 0 ? (item.waarde / vraagTotaal * 100) : 0;
            return (
              <div key={item.key} className="p-3 rounded-lg" style={{ background: 'white' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {item.label}
                  </span>
                  <div className="text-right">
                    <span className="font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
                      {gemiddeld.toFixed(1)} GJ
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: '#83AF9A' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4.3 Energie-Input (Levering) */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          4.3 Energie-Input (Levering)
        </h3>
        
        <div className="mb-4 p-3 rounded-lg" style={{ background: 'white' }}>
          <p className="text-sm mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Totale energie-input (gem.)</p>
          <p className="text-2xl font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
            {gemInputTotaal.toFixed(1)} GJ/WEQ/jaar
          </p>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Aardgas', waarde: inputAardgas, kleur: '#ef4444' },
            { label: 'Elektriciteit', waarde: inputElektriciteit, kleur: '#3b82f6' },
            { label: 'MT warmtebronnen', waarde: inputMT, kleur: '#f59e0b' },
            { label: 'LT warmtebronnen', waarde: inputLT, kleur: '#22c55e' }
          ].map((item, idx) => {
            const gemiddeld = aantalBuurten > 0 ? item.waarde / aantalBuurten : 0;
            const pct = inputTotaal > 0 ? (item.waarde / inputTotaal * 100) : 0;
            if (gemiddeld === 0) return null;
            return (
              <div key={idx} className="p-3 rounded-lg" style={{ background: 'white' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {item.label}
                  </span>
                  <div className="text-right">
                    <span className="font-bold" style={{ color: item.kleur, fontFamily: 'Raleway, sans-serif' }}>
                      {gemiddeld.toFixed(1)} GJ
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: item.kleur }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CO2 */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h3 className="font-bold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          CO₂ Uitstoot Huidige Situatie
        </h3>
        <p className="text-3xl font-bold" style={{ color: '#ef4444', fontFamily: 'Raleway, sans-serif' }}>
          {co2Totaal.toFixed(1)} mega gram/jaar
        </p>
        <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Gemiddeld {aantalBuurten > 0 ? (co2Totaal / aantalBuurten).toFixed(2) : 0} per buurt
        </p>
      </div>
    </div>
  );
};

const renderAansluitingen = () => {
  if (!pblData || selectedBuurten.length === 0) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Upload PBL data en selecteer buurten om aansluitingen te zien
        </p>
      </div>
    );
  }

  // Aggregeer aansluitingen vanuit strategieMatrix (Referentie 2023)
  let aanslAardgas = 0, aanslEWP = 0, aanslMT = 0, aanslLT = 0, aanslHWP = 0;
  let totaalWoningen = 0;

  selectedBuurten.forEach(code => {
    const referentie = pblData[code]?.strategieMatrix?.Referentie_2023;
    const totaal = pblData[code]?.totaal;
    
    if (referentie) {
      aanslAardgas += parseFloat(referentie.A01_Aansl_aardgas) || 0;
      aanslEWP += parseFloat(referentie.A02_Aansl_eWP) || 0;
      aanslMT += parseFloat(referentie.A03_Aansl_MT) || 0;
      aanslLT += parseFloat(referentie.A04_Aansl_LT) || 0;
      aanslHWP += parseFloat(referentie.A05_Aansl_hWP_HG) || 0;
    }
    
    if (totaal) {
      totaalWoningen += parseFloat(totaal.I09_aantal_woningen) || 0;
    }
  });

  const totaalAansluitingen = aanslAardgas + aanslEWP + aanslMT + aanslLT + aanslHWP;

  return (
    <div className="space-y-4">
      {/* 5.1 Aantal Aansluitingen per Type */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          5.1 Aantal Aansluitingen per Type (Huidige Situatie)
        </h3>
        
        <div className="mb-4 p-3 rounded-lg" style={{ background: 'white' }}>
          <p className="text-sm mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Totaal aansluitingen</p>
          <p className="text-2xl font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
            {Math.round(totaalAansluitingen).toLocaleString('nl-NL')}
          </p>
          <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
            op {Math.round(totaalWoningen).toLocaleString('nl-NL')} woningen
          </p>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Aardgas', aantal: aanslAardgas, icon: '🔥', kleur: '#ef4444' },
            { label: 'Elektrische Warmtepomp', aantal: aanslEWP, icon: '⚡', kleur: '#3b82f6' },
            { label: 'Hybride Warmtepomp', aantal: aanslHWP, icon: '🔄', kleur: '#f59e0b' },
            { label: 'MT Warmtenet', aantal: aanslMT, icon: '🏭', kleur: '#8b5cf6' },
            { label: 'LT Warmtenet', aantal: aanslLT, icon: '❄️', kleur: '#06b6d4' }
          ].map((item, idx) => {
            const pct = totaalAansluitingen > 0 ? (item.aantal / totaalAansluitingen * 100) : 0;
            return (
              <div key={idx} className="p-3 rounded-lg" style={{ background: 'white' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </span>
                  <div className="text-right">
                    <span className="font-bold" style={{ color: item.kleur, fontFamily: 'Raleway, sans-serif' }}>
                      {Math.round(item.aantal).toLocaleString('nl-NL')}
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: item.kleur }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dekkingsgraad */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          Dekkingsgraad
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg" style={{ background: '#F3F3E2' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Aansluitingen</p>
            <p className="text-xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              {Math.round(totaalAansluitingen).toLocaleString('nl-NL')}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#F3F3E2' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Woningen</p>
            <p className="text-xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              {Math.round(totaalWoningen).toLocaleString('nl-NL')}
            </p>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg" style={{ background: totaalAansluitingen >= totaalWoningen ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
          <p className="text-sm font-semibold" style={{ color: totaalAansluitingen >= totaalWoningen ? '#22c55e' : '#ef4444', fontFamily: 'Raleway, sans-serif' }}>
            {totaalWoningen > 0 ? ((totaalAansluitingen / totaalWoningen * 100).toFixed(1)) : 0}% dekkingsgraad
          </p>
        </div>
      </div>
    </div>
  );
};

  const StatCard = ({ label, value, measureId, unit = '%', showBar = true }) => {
    const statKey = measureId;
    const isExpanded = expandedStats[statKey];

    return (
      <div className="rounded-xl shadow-sm border-2 overflow-hidden transition-all duration-300" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <button
          onClick={() => toggleStatExpand(statKey)}
          className="w-full p-4 flex items-center justify-between transition-all duration-200"
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(131, 175, 154, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <div className="flex-1 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                {label}
              </span>
              <span className="text-lg font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
                {value !== null ? `${typeof value === 'number' ? value.toFixed(1) : value}${unit}` : 'N/A'}
              </span>
            </div>
            {showBar && value !== null && (
              <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(value, 100)}%`, background: '#83AF9A' }}
                />
              </div>
            )}
          </div>
          {isExpanded ? <ChevronUp size={20} color="#83AF9A" /> : <ChevronDown size={20} color="#83AF9A" />}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-2 border-t-2" style={{ borderColor: '#F3F3E2', background: 'rgba(131, 175, 154, 0.03)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              Per buurt:
            </p>
            {selectedBuurten.map(buurtCode => {
              const buurtNaam = getGebiedNaam(buurtCode);
              const buurtValue = detailData[buurtCode]?.[measureId];
              
              return (
                <div key={buurtCode} className="flex justify-between items-center py-1 px-2 rounded" style={{ background: 'white' }}>
                  <span className="text-xs" style={{ color: '#374151', fontFamily: 'Raleway, sans-serif' }}>
                    {buurtNaam}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {buurtValue !== undefined && buurtValue !== null ? `${buurtValue.toFixed(1)}${unit}` : 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };





  return (
    <div className="w-[600px] shadow-xl border-l-2 flex flex-col h-full transition-all duration-300 ease-in-out" style={{ 
      background: 'rgba(255, 255, 244, 0.98)',
      borderColor: '#83AF9A'
    }}>
      {/* Header met HOOFDKNOPPEN: Data en Scenario's */}
      <div className="p-4 border-b-2 flex items-center justify-between" style={{ 
        background: 'linear-gradient(135deg, #20423C 0%, #2d5e54 100%)',
        borderColor: '#83AF9A'
      }}>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMainView('data')}
            className="px-4 py-2 rounded-lg font-bold transition-all duration-200 hover:scale-105"
            style={{
              background: mainView === 'data' ? '#83AF9A' : 'rgba(255,255,255,0.1)',
              color: mainView === 'data' ? '#20423C' : 'white',
              fontFamily: 'Raleway, sans-serif'
            }}
          >
            📊 Data
          </button>
          <button
            onClick={() => setMainView('scenarios')}
            className="px-4 py-2 rounded-lg font-bold transition-all duration-200 hover:scale-105"
            style={{
              background: mainView === 'scenarios' ? '#83AF9A' : 'rgba(255,255,255,0.1)',
              color: mainView === 'scenarios' ? '#20423C' : 'white',
              fontFamily: 'Raleway, sans-serif'
            }}
          >
            🔥 Scenario's
          </button>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{ background: 'rgba(131, 175, 154, 0.3)', color: 'white' }}
            title="Sluit"
          >
            ×
          </button>
        )}
      </div>

      {/* SUBTABS - alleen voor Data view */}
      {mainView === 'data' && (
        <div className="border-b-2 overflow-x-auto" style={{ 
          background: 'white',
          borderColor: '#F3F3E2'
        }}>
          <div className="flex space-x-1 p-2">
            {dataTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap"
                style={{ 
                  background: activeTab === tab.id ? '#83AF9A' : '#F3F3E2',
                  color: '#20423C',
                  fontFamily: 'Raleway, sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = 'rgba(131, 175, 154, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = '#F3F3E2';
                  }
                }}
              >
                {tab.icon} {tab.label.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading state - alleen voor data */}
        {mainView === 'data' && (loadingData || loadingDetails) && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: '#83AF9A' }}></div>
              <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Laden...</p>
            </div>
          </div>
        )}
        
        {/* Data tabs content */}
        {mainView === 'data' && !loadingData && !loadingDetails && Object.keys(cbsData).length > 0 && (
          <>
            {activeTab === 'gebiedsinformatie' && renderGebiedsinformatie()}
            {activeTab === 'woningvoorraad' && renderWoningvoorraad()}
            {activeTab === 'utiliteit' && renderUtiliteit()}
            {activeTab === 'energievraag' && renderEnergievraag()}
            {activeTab === 'aansluitingen' && renderAansluitingen()}
          </>
        )}

        {/* Data - geen data */}
        {mainView === 'data' && Object.keys(cbsData).length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-center" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              Selecteer eerst buurten op de kaart om data te zien
            </p>
          </div>
        )}
        
        {/* Scenario's view */}
        {mainView === 'scenarios' && (
          <ScenarioCalculator 
            selectedBuurten={selectedBuurten}
            cbsData={cbsData}
            getGebiedNaam={getGebiedNaam}
            detailData={detailData}
            onPBLDataParsed={handlePBLDataParsed}
            pblData={pblData} 

          />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t-2" style={{ 
        background: '#F3F3E2',
        borderColor: '#83AF9A'
      }}>
        <p className="text-xs text-center" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          CBS Data • Tabel 85984NED • {selectedBuurten.length} buurten geselecteerd
        </p>
      </div>
    </div>
  );
}