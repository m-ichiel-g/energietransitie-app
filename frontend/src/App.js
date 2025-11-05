import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';

import {
  loadAllGeometry,
  getGemeenteCodeFromCode,
  calculateBounds,
  boundsCenter
} from './services/geometryService';

// Components
import Sidebar from './components/Sidebar';
import TopMenu from './components/TopMenu';
import KaartView from './components/KaartView';
import DataDashboard from './components/DataDashboard';
import ScenariosDashboard from './components/ScenariosDashboard';

/**
 * EnergieTool v2 - Complete Redesign met PDOK Geometrie
 * - Sidebar links met Gebied/Filter tabs
 * - Top menu met Kaart/Data/Scenario's
 * - Auto-download PBL ZIP
 * - PDOK CBS Wijken en Buurten 2024 API voor kaart
 * - Modern, vloeiend design
 */
export default function EnergieTool() {
  // Main navigation
  const [activeMainTab, setActiveMainTab] = useState('kaart');
  const [activeSidebarTab, setActiveSidebarTab] = useState('gebied');
  const isInitialGeometryLoad = useRef(false);
  const [shouldFitBounds, setShouldFitBounds] = useState(false);



  // Gebied selectie
  const [selectedGemeente, setSelectedGemeente] = useState(null);
  const [selectedWijken, setSelectedWijken] = useState([]);
  const [selectedBuurten, setSelectedBuurten] = useState([]);
  
  // Data
  const [pblData, setPblData] = useState(null);
  const [geometryData, setGeometryData] = useState({ 
    gemeente: null,
    wijken: {}, 
    buurten: {} 
  });
  
  // Loading
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [isLoadingGeometry, setIsLoadingGeometry] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  // Map
  const [mapCenter, setMapCenter] = useState([52.1326, 5.2913]);
  const [mapZoom, setMapZoom] = useState(7);

  // Scenario filters
  const [baselineJaar, setBaselineJaar] = useState('2030');
  const [selectedStrategies, setSelectedStrategies] = useState([
    'Strategie_1', 'Strategie_2', 'Strategie_3', 'Strategie_4'
  ]);
  const [scenarioFilters, setScenarioFilters] = useState({
    schillabel: null,
    toonVarianten: false
  });

  /**
   * Download PBL ZIP - Multi-method approach
   * 1. Probeer lokale proxy (cors_proxy.py) - BESTE OPTIE
   * 2. Probeer publieke CORS proxies
   * 3. Fallback: manual upload
   */
  const downloadPBLZip = async (gemeenteNaam) => {
    setIsLoadingZip(true);
    setLoadingError(null);
    
    try {
      let normalized = gemeenteNaam;
      if (gemeenteNaam === "'s-Gravenhage") normalized = "s-Gravenhage";
      if (gemeenteNaam === "'s-Hertogenbosch") normalized = "s-Hertogenbosch";
      
      console.log('📥 Attempting download for:', normalized);
      
      // Methode 1: Lokale Python proxy (BESTE)
      try {
        const localProxyUrl = `http://localhost:5001/download/${normalized}`;
        console.log('🔄 Trying local proxy...');
        
        const response = await fetch(localProxyUrl);
        
        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 1000) {
            console.log('✅ Downloaded via local proxy:', (blob.size / 1024).toFixed(1), 'KB');
            await parsePBLZip(blob);
            return;
          }
        }
      } catch (localError) {
        console.warn('⚠️ Local proxy niet beschikbaar. Start cors_proxy.py!');
      }
      
      // Methode 2: Publieke CORS proxies
      const originalUrl = `https://dataportaal.pbl.nl/data/Startanalyse_aardgasvrije_buurten/2025/Gemeentes/${normalized}.zip`;
      
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`
      ];
      
      for (const proxyUrl of proxies) {
        try {
          console.log('🔄 Trying public proxy...');
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            const blob = await response.blob();
            if (blob.size > 1000) {
              console.log('✅ Downloaded via public proxy:', (blob.size / 1024).toFixed(1), 'KB');
              await parsePBLZip(blob);
              return;
            }
          }
        } catch (err) {
          console.warn('⚠️ Public proxy failed:', err.message);
        }
      }
      
      // Methode 3: Fallback met instructies
      throw new Error(
        `Download geblokkeerd door CORS.\n\n` +
        `🔧 OPLOSSING 1 (Aanbevolen):\n` +
        `Start de proxy server:\n` +
        `  python3 cors_proxy.py\n\n` +
        `🔧 OPLOSSING 2:\n` +
        `Download handmatig:\n${originalUrl}\n\n` +
        `Upload het bestand hieronder ⬇️`
      );
      
    } catch (error) {
      console.error('❌ Error:', error);
      setLoadingError(error.message);
    } finally {
      setIsLoadingZip(false);
    }
  };

  /**
   * Handle manual ZIP upload (fallback voor CORS)
   */
  const handleManualZipUpload = async (file) => {
    if (!file || !file.name.endsWith('.zip')) {
      setLoadingError('Selecteer een geldig ZIP bestand');
      return;
    }
    
    setIsLoadingZip(true);
    setLoadingError(null);
    
    try {
      console.log('📁 Processing uploaded ZIP:', file.name);
      await parsePBLZip(file);
    } catch (error) {
      console.error('❌ Upload error:', error);
      setLoadingError(`Upload mislukt: ${error.message}`);
    } finally {
      setIsLoadingZip(false);
    }
  };

  /**
   * Parse ZIP
   */
  const parsePBLZip = async (blob) => {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(blob);
    
    let strategieFile, bebouwingFile, totaalFile;
    
    zipContent.forEach((path, file) => {
      if (path.includes('strategie') && path.endsWith('.csv')) strategieFile = file;
      else if (path.includes('bebouwing') && !path.includes('totaal') && path.endsWith('.csv')) bebouwingFile = file;
      else if (path.includes('totaalbebouwing') && path.endsWith('.csv')) totaalFile = file;
    });
    
    if (!strategieFile || !bebouwingFile || !totaalFile) {
      throw new Error('Missing CSV files');
    }
    
    const parseOpts = {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: v => {
        if (typeof v === 'string') {
          const num = parseFloat(v.replace(',', '.'));
          return isNaN(num) ? v : num;
        }
        return v;
      }
    };
    
    const strategieData = Papa.parse(await strategieFile.async('text'), parseOpts);
    const bebouwingData = Papa.parse(await bebouwingFile.async('text'), parseOpts);
    const totaalData = Papa.parse(await totaalFile.async('text'), parseOpts);
    
    // Organiseer data
    const dataPerBuurt = {};
    
    totaalData.data.forEach(row => {
      const code = row.I01_buurtcode;
      if (code) dataPerBuurt[code] = { totaal: row, strategie: null, strategieMatrix: {}, bebouwing: [] };
    });
    
    const strategiePerBuurt = {};
    strategieData.data.forEach(row => {
      const code = row.I01_buurtcode;
      if (!code) return;
      if (!strategiePerBuurt[code]) strategiePerBuurt[code] = [];
      strategiePerBuurt[code].push(row);
    });
    
    Object.keys(strategiePerBuurt).forEach(code => {
      if (!dataPerBuurt[code]) {
        dataPerBuurt[code] = { totaal: null, strategie: null, strategieMatrix: {}, bebouwing: [] };
      }
      
      const rows = strategiePerBuurt[code];
      const matrixRows = rows.filter(r => r.Code_Indicator);
      
      if (matrixRows.length > 0) {
        const basisRow = rows.find(r => !r.Code_Indicator);
        if (basisRow) dataPerBuurt[code].strategie = basisRow;
        
        const kolommen = Object.keys(matrixRows[0]).filter(k => 
          !['I01_buurtcode', 'I02_buurtnaam', 'Code_Indicator', 'Indicator_Label', ''].includes(k)
        );
        
        matrixRows.forEach(row => {
          const ind = row.Code_Indicator;
          if (!ind) return;
          dataPerBuurt[code].strategieMatrix[ind] = {};
          kolommen.forEach(k => {
            dataPerBuurt[code].strategieMatrix[ind][k] = row[k];
          });
        });
      }
    });
    
    bebouwingData.data.forEach(row => {
      const code = row.I01_buurtcode;
      if (code && dataPerBuurt[code]) {
        dataPerBuurt[code].bebouwing.push(row);
      }
    });
    
    const strategieKolommen = Array.from(new Set(
      Object.values(dataPerBuurt)
        .filter(b => b.strategieMatrix && Object.keys(b.strategieMatrix).length > 0)
        .flatMap(b => {
          const firstIndicator = Object.values(b.strategieMatrix)[0];
          return Object.keys(firstIndicator || {});
        })
    ));
    
    // Extract wijken info
    const wijkenMap = new Map();
    const buurtenList = [];
    
    Object.entries(dataPerBuurt).forEach(([code, data]) => {
      if (!data.totaal) return;
      
      const wijkcode = data.totaal.I03_wijkcode;
      const wijknaam = data.totaal.I04_wijknaam;
      const buurtnaam = data.totaal.I02_buurtnaam;
      
      if (!wijkenMap.has(wijkcode)) {
        wijkenMap.set(wijkcode, {
          code: wijkcode,
          naam: wijknaam,
          buurten: []
        });
      }
      
      const buurtData = {
        code: code,
        naam: buurtnaam,
        wijkcode: wijkcode
      };
      
      wijkenMap.get(wijkcode).buurten.push(buurtData);
      buurtenList.push(buurtData);
    });
    
    // Convert map to arrays
    const wijkenList = Array.from(wijkenMap.values());
    
    console.log('🏘️ Wijken gevonden:', wijkenList.length);
    console.log('🏠 Buurten gevonden:', buurtenList.length);
    wijkenList.forEach(w => {
      console.log(`  ${w.naam} (${w.code}): ${w.buurten.length} buurten`);
    });
    
    const parsed = {
      buurten: dataPerBuurt,
      wijkenList: wijkenList.map(w => w.code),
      wijkenData: wijkenMap,
      buurtenList,
      strategieKolommen,
      metadata: {
        aantalBuurten: Object.keys(dataPerBuurt).length,
        aantalWijken: wijkenList.length,
        aantalStrategieKolommen: strategieKolommen.length,
        parseDate: new Date().toISOString()
      }
    };
    
    setPblData(parsed);
    
    // Laad gemeente geometrie automatisch
    if (buurtenList.length > 0) {
      const firstBuurtCode = buurtenList[0].code;
      const gemeenteCode = getGemeenteCodeFromCode(firstBuurtCode);
      
      if (gemeenteCode) {
        console.log('🗺️ Auto-laden gemeente geometrie:', gemeenteCode);
      await loadGeometry({ gemeenteCode, shouldZoom: true });
      }
    }
  };

  /**
   * Laad geometrie voor geselecteerde gebieden
   */
const loadGeometry = async ({ gemeenteCode, wijkCodes, buurtCodes, shouldZoom = false }) => {
  setIsLoadingGeometry(true);
  
  try {
    const result = await loadAllGeometry({
      gemeenteCode,
      wijkCodes: wijkCodes || selectedWijken,
      buurtCodes: buurtCodes || selectedBuurten
    });
    
    setGeometryData(result);
   setShouldFitBounds(shouldZoom); 

    
    // ALLEEN zoomen als shouldZoom = true
    if (shouldZoom && result.gemeente) {
      const bounds = calculateBounds(result.gemeente.geometry);
      if (bounds) {
        const center = boundsCenter(bounds);
        setMapCenter(center);
        setMapZoom(12);
      }
    }
    
  } catch (error) {
    console.error('❌ Error loading geometry:', error);
  } finally {
    setIsLoadingGeometry(false);
  }
};

  /**
   * Effect: Laad geometrie wanneer selectie wijzigt
   */
  useEffect(() => {
    if (!pblData) return;
    
    // Bepaal gemeente code
    let gemeenteCode = null;
    if (selectedBuurten.length > 0) {
      gemeenteCode = getGemeenteCodeFromCode(selectedBuurten[0]);
    } else if (selectedWijken.length > 0) {
      gemeenteCode = getGemeenteCodeFromCode(selectedWijken[0]);
    } else if (pblData.buurtenList && pblData.buurtenList.length > 0) {
      gemeenteCode = getGemeenteCodeFromCode(pblData.buurtenList[0].code);
    }

        // Skip als dit de initiële load is (wordt al gedaan in parsePBLZip)
    if (!isInitialGeometryLoad.current) {
      isInitialGeometryLoad.current = true;
      return;  // ← Skip eerste keer
    }
    
    // Laad geometrie
    loadGeometry({
      gemeenteCode,
      wijkCodes: selectedWijken,
      buurtCodes: selectedBuurten,
      shouldZoom: false  // ← NIET zoomen!
    });
  }, [selectedWijken, selectedBuurten, pblData]);

  const handleGemeenteSelect = async (gem) => {
    setSelectedGemeente(gem);
    setSelectedWijken([]);
    setSelectedBuurten([]);
    setPblData(null);
    setGeometryData({ gemeente: null, wijken: {}, buurten: {} });
    isInitialGeometryLoad.current = false;  // ← Reset bij nieuwe gemeente
    await downloadPBLZip(gem.naam);
  };

  const handleReset = () => {
    setSelectedGemeente(null);
    setSelectedWijken([]);
    setSelectedBuurten([]);
    setPblData(null);
    setGeometryData({ gemeente: null, wijken: {}, buurten: {} });
    setMapCenter([52.1326, 5.2913]);
    setMapZoom(7);
  };

  return (
    <div className="h-screen flex" style={{ background: '#FAFAFA', fontFamily: 'Raleway, sans-serif' }}>
      
      <Sidebar
        activeTab={activeSidebarTab}
        onTabChange={setActiveSidebarTab}
        selectedGemeente={selectedGemeente}
        selectedWijken={selectedWijken}
        selectedBuurten={selectedBuurten}
        pblData={pblData}
        onGemeenteSelect={handleGemeenteSelect}
        onWijkToggle={(wijkcode) => {
          const isCurrentlySelected = selectedWijken.includes(wijkcode);
          
          // Toggle wijk
          setSelectedWijken(prev => 
            prev.includes(wijkcode) 
              ? prev.filter(w => w !== wijkcode)
              : [...prev, wijkcode]
          );
          
          // Toggle alle buurten in deze wijk
          if (pblData) {
            const buurtenInWijk = pblData.buurtenList
              .filter(b => b.wijkcode === wijkcode)
              .map(b => b.code);
            
            if (isCurrentlySelected) {
              // Deselect buurten
              setSelectedBuurten(prev => prev.filter(b => !buurtenInWijk.includes(b)));
            } else {
              // Select buurten
              setSelectedBuurten(prev => {
                const newSelection = [...prev];
                buurtenInWijk.forEach(b => {
                  if (!newSelection.includes(b)) newSelection.push(b);
                });
                return newSelection;
              });
            }
          }
        }}
        onBuurtToggle={(b) => {
          setSelectedBuurten(p => 
            p.includes(b) ? p.filter(x => x !== b) : [...p, b]
          );
        }}
        onReset={handleReset}
        isLoadingZip={isLoadingZip}
        loadingError={loadingError}
        onManualZipUpload={handleManualZipUpload}
        baselineJaar={baselineJaar}
        setBaselineJaar={setBaselineJaar}
        selectedStrategies={selectedStrategies}
        setSelectedStrategies={setSelectedStrategies}
        scenarioFilters={scenarioFilters}
        setScenarioFilters={setScenarioFilters}
      />

      <div className="flex-1 flex flex-col">
        <TopMenu
          activeTab={activeMainTab}
          onTabChange={setActiveMainTab}
          hasData={pblData !== null}
        />

        <div className="flex-1 overflow-hidden">
          {activeMainTab === 'kaart' && (
            <KaartView
              geometryData={geometryData}
              selectedWijken={selectedWijken}
              selectedBuurten={selectedBuurten}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              shouldFitBounds={shouldFitBounds}  

            />
          )}
          
          {activeMainTab === 'data' && (
            <DataDashboard
              pblData={pblData}
              selectedBuurten={selectedBuurten}
            />
          )}
          
          {activeMainTab === 'scenarios' && (
            <ScenariosDashboard
              pblData={pblData}
              selectedBuurten={selectedBuurten}
              baselineJaar={baselineJaar}
              selectedStrategies={selectedStrategies}
            />
          )}
        </div>
      </div>
      
      {/* Loading overlay voor geometrie */}
      {isLoadingGeometry && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <p className="text-sm font-semibold" style={{ color: '#20423C' }}>
              🗺️ Laden kaartgegevens...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}