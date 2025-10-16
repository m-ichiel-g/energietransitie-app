import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Dashboard from './Dashboard';

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function EnergieTool() {
  // State
  const [gemeenten, setGemeenten] = useState([]);
  const [gemeenteZoek, setGemeenteZoek] = useState('');
  const [selectedGemeenten, setSelectedGemeenten] = useState([]);
  const [gemeenteData, setGemeenteData] = useState({});
  const [wijkenData, setWijkenData] = useState({});
  const [buurtenData, setBuurtenData] = useState({});
  const [selectedWijken, setSelectedWijken] = useState([]);
  const [selectedBuurten, setSelectedBuurten] = useState([]);
  const [cbsData, setCbsData] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [mapCenter, setMapCenter] = useState([52.1326, 5.2913]);
  const [mapZoom, setMapZoom] = useState(7);
  const [loading, setLoading] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(true);

  // Laad alle gemeenten bij start
  useEffect(() => {
    fetchGemeenten();
  }, []);

  const fetchGemeenten = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://api.pdok.nl/cbs/gebiedsindelingen/ogc/v1/collections/gemeente_gegeneraliseerd/items?f=json&limit=1000'
      );
      const data = await response.json();
      
      const gemeenteMap = new Map();
      data.features.forEach(f => {
        if (!gemeenteMap.has(f.properties.statcode)) {
          gemeenteMap.set(f.properties.statcode, {
            code: f.properties.statcode,
            naam: f.properties.statnaam,
            geometry: f.geometry
          });
        }
      });
      
      const gemeenteList = Array.from(gemeenteMap.values())
        .sort((a, b) => a.naam.localeCompare(b.naam));
      
      setGemeenten(gemeenteList);
      setLoading(false);
    } catch (error) {
      console.error('Fout bij ophalen gemeenten:', error);
      setLoading(false);
    }
  };

  // Wis alle selecties
  const wisAlles = () => {
    setSelectedGemeenten([]);
    setSelectedWijken([]);
    setSelectedBuurten([]);
    setGemeenteData({});
    setWijkenData({});
    setBuurtenData({});
    setCbsData({});
    setMapCenter([52.1326, 5.2913]);
    setMapZoom(7);
  };

  // Filter gemeenten op zoekterm
  const gefilterdGemeenten = gemeenten.filter(g =>
    g.naam.toLowerCase().includes(gemeenteZoek.toLowerCase())
  );

  // Toggle gemeente selectie
  const toggleGemeente = async (gemeente) => {
    const isSelected = selectedGemeenten.includes(gemeente.code);
    
    if (isSelected) {
      // Deselecteer gemeente + alle wijken/buurten ervan
      setSelectedGemeenten(prev => prev.filter(c => c !== gemeente.code));
      setSelectedWijken(prev => prev.filter(w => !w.startsWith('WK' + gemeente.code.replace('GM', ''))));
      setSelectedBuurten(prev => prev.filter(b => !b.startsWith('BU' + gemeente.code.replace('GM', ''))));
      
      // Verwijder data
      const newGemeenteData = { ...gemeenteData };
      delete newGemeenteData[gemeente.code];
      setGemeenteData(newGemeenteData);
      
      const newWijkenData = { ...wijkenData };
      delete newWijkenData[gemeente.code];
      setWijkenData(newWijkenData);
      
      // Verwijder buurten data van alle wijken in deze gemeente
      const newBuurtenData = { ...buurtenData };
      Object.keys(newBuurtenData).forEach(key => {
        if (key.startsWith('WK' + gemeente.code.replace('GM', ''))) {
          delete newBuurtenData[key];
        }
      });
      setBuurtenData(newBuurtenData);
    } else {
      // Selecteer gemeente
      setSelectedGemeenten(prev => [...prev, gemeente.code]);
      
      // Zoom naar gemeente - compenseer voor dashboard balk (600px breed dashboard)
      const bounds = getBounds(gemeente.geometry);
      const center = [(bounds.minLat + bounds.maxLat) / 2, (bounds.minLon + bounds.maxLon) / 2];
      
      // Bereken offset om gemeente in zichtbaar centrum te houden met breder dashboard
      const offsetLon = (bounds.maxLon - bounds.minLon) * 0.55;
      setMapCenter([center[0], center[1] - offsetLon]);
      setMapZoom(11);
      
      // Sla geometrie op
      setGemeenteData(prev => ({
        ...prev,
        [gemeente.code]: { ...gemeente, geometry: gemeente.geometry }
      }));
      
      // Laad wijken
      await loadWijken(gemeente);
    }
  };

  const loadWijken = async (gemeente) => {
    try {
      const bounds = getBounds(gemeente.geometry);
      const bbox = `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`;
      
      const response = await fetch(
        `https://api.pdok.nl/cbs/gebiedsindelingen/ogc/v1/collections/wijk_gegeneraliseerd/items?f=json&limit=300&bbox=${bbox}`
      );
      const data = await response.json();
      
      const gemeenteNummer = gemeente.code.replace('GM', '');
      const wijkenFiltered = data.features.filter(f => {
        const wijkBounds = getBounds(f.geometry);
        const centroid = [
          (wijkBounds.minLon + wijkBounds.maxLon) / 2,
          (wijkBounds.minLat + wijkBounds.maxLat) / 2
        ];
        return centroid[0] >= bounds.minLon && centroid[0] <= bounds.maxLon &&
               centroid[1] >= bounds.minLat && centroid[1] <= bounds.maxLat;
      });
      
      const uniqueWijken = new Map();
      wijkenFiltered.forEach(f => uniqueWijken.set(f.properties.statcode, f));
      
      setWijkenData(prev => ({
        ...prev,
        [gemeente.code]: Array.from(uniqueWijken.values())
      }));
    } catch (error) {
      console.error('Fout bij laden wijken:', error);
    }
  };

  // Toggle wijk + auto-select alle buurten
  const toggleWijk = async (wijkCode, gemeenteCode) => {
    const isSelected = selectedWijken.includes(wijkCode);
    
    if (isSelected) {
      // Deselecteer wijk + alle buurten
      setSelectedWijken(prev => prev.filter(w => w !== wijkCode));
      const wijkNummer = wijkCode.replace('WK', '');
      setSelectedBuurten(prev => prev.filter(b => !b.startsWith('BU' + wijkNummer)));
      
      // Verwijder buurten data
      const newBuurtenData = { ...buurtenData };
      delete newBuurtenData[wijkCode];
      setBuurtenData(newBuurtenData);
    } else {
      // Selecteer wijk
      setSelectedWijken(prev => [...prev, wijkCode]);
      
      // Laad buurten als nog niet geladen
      if (!buurtenData[wijkCode]) {
        await loadBuurten(wijkCode, gemeenteCode);
        // Wacht even tot state is bijgewerkt, dan auto-selecteer
        setTimeout(() => {
          setBuurtenData(current => {
            const buurten = current[wijkCode] || [];
            const buurtCodes = buurten.map(b => b.properties.statcode);
            setSelectedBuurten(prev => [...new Set([...prev, ...buurtCodes])]);
            return current;
          });
        }, 100);
      } else {
        // Buurten al geladen, direct selecteren
        const buurten = buurtenData[wijkCode] || [];
        const buurtCodes = buurten.map(b => b.properties.statcode);
        setSelectedBuurten(prev => [...new Set([...prev, ...buurtCodes])]);
      }
    }
  };

  const loadBuurten = async (wijkCode, gemeenteCode) => {
    try {
      const gemeente = gemeenteData[gemeenteCode];
      if (!gemeente) return;
      
      const bounds = getBounds(gemeente.geometry);
      const bbox = `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`;
      
      const response = await fetch(
        `https://api.pdok.nl/cbs/gebiedsindelingen/ogc/v1/collections/buurt_gegeneraliseerd/items?f=json&limit=500&bbox=${bbox}`
      );
      const data = await response.json();
      
      const wijkNummer = wijkCode.replace('WK', '');
      const buurtenFiltered = data.features.filter(f => 
        f.properties.statcode.startsWith('BU' + wijkNummer)
      );
      
      const uniqueBuurten = new Map();
      buurtenFiltered.forEach(f => uniqueBuurten.set(f.properties.statcode, f));
      
      setBuurtenData(prev => ({
        ...prev,
        [wijkCode]: Array.from(uniqueBuurten.values())
      }));
    } catch (error) {
      console.error('Fout bij laden buurten:', error);
    }
  };

  // Toggle individuele buurt
  const toggleBuurt = (buurtCode) => {
    setSelectedBuurten(prev => {
      if (prev.includes(buurtCode)) {
        return prev.filter(b => b !== buurtCode);
      } else {
        return [...prev, buurtCode];
      }
    });
  };

  // CBS Data ophalen
  useEffect(() => {
    const allCodes = [...selectedGemeenten, ...selectedWijken, ...selectedBuurten];
    if (allCodes.length === 0) {
      setCbsData({});
      return;
    }

    const timer = setTimeout(() => {
      fetchCBSData(allCodes);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedGemeenten, selectedWijken, selectedBuurten]);

  const fetchCBSData = async (codes) => {
    setLoadingData(true);
    try {
      const tableId = '85984NED';
      const measureId = 'M000297';

      const dataPromises = codes.map(async (code) => {
        const url = `https://datasets.cbs.nl/odata/v1/CBS/${tableId}/Observations?$filter=WijkenEnBuurten eq '${code}' and Measure eq '${measureId}'&$select=WijkenEnBuurten,Measure,Value`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.value && data.value.length > 0) {
            return {
              code,
              naam: getGebiedNaam(code),
              aantalWoningen: parseInt(data.value[0]?.Value || 0, 10),
              type: code.startsWith('GM') ? 'gemeente' : code.startsWith('WK') ? 'wijk' : 'buurt'
            };
          }
          return null;
        } catch (err) {
          console.error(`Fout CBS data ${code}:`, err);
          return null;
        }
      });

      const results = await Promise.all(dataPromises);
      const dataObject = {};
      results.filter(r => r).forEach(r => dataObject[r.code] = r);
      
      setCbsData(dataObject);
      setLoadingData(false);
    } catch (error) {
      console.error('Fout bij laden CBS:', error);
      setLoadingData(false);
    }
  };

  const getGebiedNaam = (code) => {
    // Gemeente
    if (gemeenteData[code]) return gemeenteData[code].naam;
    
    // Wijk
    for (const wijken of Object.values(wijkenData)) {
      const wijk = wijken.find(w => w.properties.statcode === code);
      if (wijk) return wijk.properties.statnaam;
    }
    
    // Buurt
    for (const buurten of Object.values(buurtenData)) {
      const buurt = buurten.find(b => b.properties.statcode === code);
      if (buurt) return buurt.properties.statnaam;
    }
    
    return code;
  };

  const getBounds = (geometry) => {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    
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
    
    processCoords(geometry.coordinates);
    return { minLon, maxLon, minLat, maxLat };
  };

  // Styles voor polygonen - minimalistisch met kleurenschema
  const gemeenteStyle = {
    fillColor: '#83AF9A',
    fillOpacity: 0.08,
    color: '#20423C',
    weight: 2,
    interactive: false
  };

  const wijkStyle = (feature) => {
    const isSelected = selectedWijken.includes(feature.properties.statcode);
    return {
      fillColor: isSelected ? '#83AF9A' : '#83AF9A',
      fillOpacity: isSelected ? 0.25 : 0.12,
      color: '#20423C',
      weight: isSelected ? 2 : 1
    };
  };

  const buurtStyle = (feature) => {
    const isSelected = selectedBuurten.includes(feature.properties.statcode);
    return {
      fillColor: isSelected ? '#6f9884' : '#83AF9A',
      fillOpacity: isSelected ? 0.35 : 0.15,
      color: '#20423C',
      weight: isSelected ? 2 : 1
    };
  };

  const onEachWijk = (feature, layer) => {
    const gemeenteCode = 'GM' + feature.properties.statcode.substring(2, 6);
    layer.on({
      click: () => toggleWijk(feature.properties.statcode, gemeenteCode)
    });
    layer.bindTooltip(feature.properties.statnaam, { direction: 'center' });
  };

  const onEachBuurt = (feature, layer) => {
    layer.on({
      click: () => toggleBuurt(feature.properties.statcode)
    });
    layer.bindTooltip(feature.properties.statnaam, { direction: 'center' });
  };

  // Maak alle GeoJSON - alleen geselecteerde gebieden
  const allGemeenteGeo = selectedGemeenten.map(code => gemeenteData[code]?.geometry).filter(Boolean);
  const allWijkenGeo = Object.entries(wijkenData)
    .flatMap(([gemCode, wijken]) => 
      selectedGemeenten.includes(gemCode) 
        ? wijken.filter(w => selectedWijken.includes(w.properties.statcode))
        : []
    );
  const allBuurtenGeo = Object.entries(buurtenData)
    .flatMap(([wijkCode, buurten]) => 
      selectedWijken.includes(wijkCode)
        ? buurten.filter(b => selectedBuurten.includes(b.properties.statcode))
        : []
    );

  return (
    <div className="flex h-screen" style={{ background: 'linear-gradient(135deg, #FFFFF4 0%, #F3F3E2 100%)' }}>
      {/* Linker Sidebar */}
      <div className="w-96 bg-white shadow-xl overflow-y-auto border-r-2" style={{ borderColor: '#83AF9A', background: 'rgba(255, 255, 244, 0.95)' }}>
        <div className="sticky top-0 z-10 p-6 border-b-2" style={{ 
          background: 'linear-gradient(135deg, #20423C 0%, #2d5e54 100%)',
          borderColor: '#83AF9A'
        }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Raleway, sans-serif' }}>
              🗺️ Gebied Selectie
            </h1>
            {(selectedGemeenten.length > 0 || selectedWijken.length > 0 || selectedBuurten.length > 0) && (
              <button
                onClick={wisAlles}
                className="px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ 
                  background: '#83AF9A',
                  color: '#20423C',
                  fontFamily: 'Raleway, sans-serif'
                }}
              >
                Wis alles
              </button>
            )}
          </div>

          {/* Zoekbalk */}
          <input
            type="text"
            placeholder="Zoek gemeente..."
            value={gemeenteZoek}
            onChange={(e) => setGemeenteZoek(e.target.value)}
            className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200"
            style={{ 
              background: 'white',
              borderColor: '#F3F3E2',
              fontFamily: 'Raleway, sans-serif',
              color: '#20423C'
            }}
            onFocus={(e) => e.target.style.borderColor = '#83AF9A'}
            onBlur={(e) => e.target.style.borderColor = '#F3F3E2'}
          />
        </div>

        <div className="p-6">
          {/* Gemeente lijst (alleen als niets geselecteerd) */}
          {selectedGemeenten.length === 0 && (
            <div className="mb-6">
              <p className="text-sm mb-3" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                Selecteer één of meer gemeenten:
              </p>
              <div className="space-y-1 max-h-96 overflow-y-auto border-2 rounded-xl p-2" style={{ 
                borderColor: '#F3F3E2',
                background: 'white'
              }}>
                {gefilterdGemeenten.map(g => (
                  <button
                    key={g.code}
                    onClick={() => toggleGemeente(g)}
                    className="w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:scale-102"
                    style={{ 
                      fontFamily: 'Raleway, sans-serif',
                      color: '#20423C'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(131, 175, 154, 0.1)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    {g.naam}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Geselecteerde gebieden */}
          {selectedGemeenten.length > 0 && (
            <div className="space-y-3">
              {selectedGemeenten.map(gemCode => {
                const gemeente = gemeenteData[gemCode];
                const wijken = wijkenData[gemCode] || [];
                
                return (
                  <div key={gemCode} className="border-2 rounded-xl overflow-hidden shadow-lg transition-all duration-200" style={{ 
                    borderColor: '#83AF9A',
                    background: '#F3F3E2'
                  }}>
                    {/* Gemeente header */}
                    <div className="p-3 flex items-center justify-between" style={{ background: 'rgba(131, 175, 154, 0.2)' }}>
                      <span className="text-sm font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                        📍 {gemeente?.naam}
                      </span>
                      <button
                        onClick={() => toggleGemeente(gemeente)}
                        className="px-2 py-1 font-bold rounded-full transition-all duration-200 hover:scale-110"
                        style={{ color: '#20423C' }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Wijken */}
                    <div className="p-3 space-y-2 max-h-80 overflow-y-auto" style={{ background: 'white' }}>
                      {wijken.length === 0 && (
                        <p className="text-xs italic" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                          Wijken laden...
                        </p>
                      )}
                      {wijken.map(wijk => {
                        const wijkCode = wijk.properties.statcode;
                        const isWijkSelected = selectedWijken.includes(wijkCode);
                        const buurten = buurtenData[wijkCode] || [];
                        
                        return (
                          <div key={wijkCode} className="border-l-4 pl-3" style={{ borderColor: '#83AF9A' }}>
                            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg transition-all duration-200"
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(131, 175, 154, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <input
                                type="checkbox"
                                checked={isWijkSelected}
                                onChange={() => toggleWijk(wijkCode, gemCode)}
                                className="rounded"
                                style={{ accentColor: '#83AF9A' }}
                              />
                              <span className="text-sm font-medium" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                                {wijk.properties.statnaam}
                              </span>
                            </label>

                            {/* Buurten */}
                            {isWijkSelected && buurten.length > 0 && (
                              <div className="ml-6 mt-2 space-y-1 border-l-4 pl-3" style={{ borderColor: '#6f9884' }}>
                                {buurten.map(buurt => {
                                  const buurtCode = buurt.properties.statcode;
                                  const isBuurtSelected = selectedBuurten.includes(buurtCode);
                                  
                                  return (
                                    <label key={buurtCode} className="flex items-center space-x-2 cursor-pointer p-1 rounded-lg transition-all duration-200"
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(111, 152, 132, 0.1)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isBuurtSelected}
                                        onChange={() => toggleBuurt(buurtCode)}
                                        className="rounded"
                                        style={{ accentColor: '#6f9884' }}
                                      />
                                      <span className="text-xs" style={{ color: '#374151', fontFamily: 'Raleway, sans-serif' }}>
                                        {buurt.properties.statnaam}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add more knop */}
          {selectedGemeenten.length > 0 && (
            <button
              onClick={() => setSelectedGemeenten([])}
              className="mt-4 w-full py-3 border-2 border-dashed rounded-xl font-semibold transition-all duration-200 hover:scale-102"
              style={{ 
                borderColor: '#83AF9A',
                color: '#20423C',
                background: 'transparent',
                fontFamily: 'Raleway, sans-serif'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(131, 175, 154, 0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              + Andere gemeente toevoegen
            </button>
          )}
        </div>
      </div>

      {/* Kaart */}
      <div className="flex-1 relative flex">
        <div className="flex-1">
          <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
            <MapController center={mapCenter} zoom={mapZoom} />
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {allGemeenteGeo.map((geom, i) => (
              <GeoJSON key={`gem-${i}`} data={{ type: 'Feature', geometry: geom }} style={gemeenteStyle} interactive={false} />
            ))}
            
            {allWijkenGeo.length > 0 && (
              <GeoJSON 
                key={`wijken-${selectedWijken.join('-')}`}
                data={{ type: 'FeatureCollection', features: allWijkenGeo }}
                style={wijkStyle}
                onEachFeature={onEachWijk}
              />
            )}
            
            {allBuurtenGeo.length > 0 && (
              <GeoJSON
                key={`buurten-${selectedBuurten.join('-')}`}
                data={{ type: 'FeatureCollection', features: allBuurtenGeo }}
                style={buurtStyle}
                onEachFeature={onEachBuurt}
              />
            )}
          </MapContainer>
        </div>

        {/* Dashboard rechts */}
        {Object.keys(cbsData).length > 0 && dashboardOpen && (
          <Dashboard
            cbsData={cbsData}
            selectedGemeenten={selectedGemeenten}
            selectedWijken={selectedWijken}
            selectedBuurten={selectedBuurten}
            gemeenteData={gemeenteData}
            getGebiedNaam={getGebiedNaam}
            loadingData={loadingData}
            onClose={() => setDashboardOpen(false)}
          />
        )}

        {/* Toggle button voor dashboard */}
        {Object.keys(cbsData).length > 0 && !dashboardOpen && (
          <button
            onClick={() => setDashboardOpen(true)}
            className="absolute top-4 right-4 px-4 py-3 rounded-xl font-semibold shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ 
              background: '#83AF9A',
              color: '#20423C',
              fontFamily: 'Raleway, sans-serif'
            }}
          >
            📊 Open Dashboard
          </button>
        )}
      </div>
    </div>
  );
}