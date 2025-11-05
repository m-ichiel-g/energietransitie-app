import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2 && bounds[0].length === 2 && bounds[1].length === 2) {
      // Valideer dat bounds zinvol zijn (binnen Nederland ongeveer)
      const [[minLat, minLon], [maxLat, maxLon]] = bounds;
      
      // Nederland ligt tussen lat 50-54 en lon 3-8 ongeveer
      if (minLat >= 48 && maxLat <= 56 && minLon >= 2 && maxLon <= 9) {
        map.fitBounds(bounds, { padding: [50, 50] });


      } else {
        console.warn('⚠️ Bounds buiten Nederland:', bounds);
      }
    }
  }, [bounds, map]);
  return null;
}

/**
 * KaartView - Toont gemeente, wijken en buurten op de kaart
 */
export default function KaartView({ 
  geometryData, 
  selectedWijken, 
  selectedBuurten, 
  mapCenter, 
  mapZoom,
  shouldFitBounds = false
}) {
  
  // Bereken bounds op basis van beschikbare geometrie
  const mapBounds = useMemo(() => {
    if (!geometryData) return null;
    
    let features = [];
    
    // Voeg features toe in volgorde van voorkeur
    if (geometryData.gemeente && geometryData.gemeente.geometry) {
      features.push(geometryData.gemeente);
    }
    
    if (geometryData.wijken) {
      const wijkFeatures = Object.values(geometryData.wijken).filter(f => f && f.geometry);
      if (wijkFeatures.length > 0) {
        features = features.concat(wijkFeatures);
      }
    }
    
    if (geometryData.buurten) {
      const buurtFeatures = Object.values(geometryData.buurten).filter(f => f && f.geometry);
      if (buurtFeatures.length > 0) {
        features = features.concat(buurtFeatures);
      }
    }
    
    if (features.length === 0) {
      console.log('⚠️ Geen features voor bounds berekening');
      return null;
    }
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    
    features.forEach(feature => {
      if (!feature.geometry) return;
      
      const processCoords = (coords) => {
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          // Single coordinate [lon, lat]
          minLon = Math.min(minLon, coords[0]);
          maxLon = Math.max(maxLon, coords[0]);
          minLat = Math.min(minLat, coords[1]);
          maxLat = Math.max(maxLat, coords[1]);
        } else if (Array.isArray(coords)) {
          coords.forEach(processCoords);
        }
      };
      
      try {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates.forEach(processCoords);
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach(polygon => {
            if (Array.isArray(polygon)) {
              polygon.forEach(processCoords);
            }
          });
        }
      } catch (error) {
        console.error('Error processing geometry:', error);
      }
    });
    
    if (minLat === Infinity || isNaN(minLat) || isNaN(maxLat) || isNaN(minLon) || isNaN(maxLon)) {
      console.warn('⚠️ Ongeldige bounds berekend');
      return null;
    }
    
    const bounds = [[minLat, minLon], [maxLat, maxLon]];
    console.log('📐 Berekende bounds:', bounds);
    
    return bounds;
  }, [geometryData]);
  
  // Style functie voor gemeente (achtergrond)
  const gemeenteStyle = {
    fillColor: '#E5E7EB',
    weight: 2,
    opacity: 0.5,
    color: '#e28029ff',
    fillOpacity: 0.15
  };
  
  // Style functie voor wijken (alleen lijn, geen vulling)
  const wijkStyle = (feature) => {
    const code = feature.properties?.wijkcode;
    const isSelected = selectedWijken && selectedWijken.includes(code);
    
    return {
      fillColor: 'transparent',
      weight: isSelected ? 3 : 2,
      opacity: isSelected ? 1 : 0.5,
      color: isSelected ? '#20423C' : '#9CA3AF',
      fillOpacity: 0,
      dashArray: isSelected ? null : '5, 5'
    };
  };
  
  // Style functie voor buurten (lijn + arcering)
  const buurtStyle = (feature) => {
    const code = feature.properties?.buurtcode;
    const isSelected = selectedBuurten && selectedBuurten.includes(code);
    
    return {
      fillColor: isSelected ? '#83AF9A' : '#E5E7EB',
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#20423C' : '#9CA3AF',
      fillOpacity: isSelected ? 0.4 : 0.2
    };
  };
  
  // Verzamel alle features
  const gemeenteFeature = geometryData?.gemeente;
  const wijkenFeatures = geometryData?.wijken ? Object.values(geometryData.wijken).filter(f => f && f.geometry) : [];
  const buurtenFeatures = geometryData?.buurten ? Object.values(geometryData.buurten).filter(f => f && f.geometry) : [];
  
  // Tel geselecteerde items met geometrie
  const selectedWijkenWithGeo = selectedWijken 
    ? selectedWijken.filter(code => geometryData?.wijken?.[code]?.geometry).length 
    : 0;
  const selectedBuurtenWithGeo = selectedBuurten
    ? selectedBuurten.filter(code => geometryData?.buurten?.[code]?.geometry).length
    : 0;
  
  const totalSelectedWijken = selectedWijken ? selectedWijken.length : 0;
  const totalSelectedBuurten = selectedBuurten ? selectedBuurten.length : 0;
  
  const missingWijkenGeo = totalSelectedWijken - selectedWijkenWithGeo;
  const missingBuurtenGeo = totalSelectedBuurten - selectedBuurtenWithGeo;
  
  const hasGeometry = gemeenteFeature || wijkenFeatures.length > 0 || buurtenFeatures.length > 0;
  
  // Log voor debugging
  useEffect(() => {
    console.log('🗺️ KaartView render:', {
      gemeente: !!gemeenteFeature,
      wijken: wijkenFeatures.length,
      buurten: buurtenFeatures.length,
      bounds: mapBounds
    });
  }, [gemeenteFeature, wijkenFeatures.length, buurtenFeatures.length, mapBounds]);

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        className="h-full w-full"
        zoomControl={true}
      >
      {shouldFitBounds && mapBounds && <FitBounds bounds={mapBounds} />}

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* 1. Gemeente (onderste laag - achtergrond) */}
        {gemeenteFeature && gemeenteFeature.geometry && (
          <GeoJSON
            key={`gemeente-${gemeenteFeature.properties?.statcode || 'unknown'}`}
            data={gemeenteFeature}
            style={gemeenteStyle}
            onEachFeature={(feature, layer) => {
              const naam = feature.properties?.gemeentenaam || feature.properties?.gemeentecode || 'Gemeente';
              layer.bindTooltip(`Gemeente: ${naam}`, {
                permanent: false,
                direction: 'top'
              });
            }}
          />
        )}
        
        {/* 2. Alle wijken (middelste laag - alleen lijnen) */}
        {wijkenFeatures.length > 0 && (
          <GeoJSON
            key={`wijken-${wijkenFeatures.length}-${selectedWijken?.join(',') || 'none'}`}
            data={{ type: 'FeatureCollection', features: wijkenFeatures }}
            style={wijkStyle}
            onEachFeature={(feature, layer) => {
              const naam = feature.properties?.wijknaam || feature.properties?.wijkcode || 'Wijk';
              layer.bindTooltip(`Wijk: ${naam}`, {
                permanent: false,
                direction: 'top'
              });
            }}
          />
        )}
        
        {/* 3. Alle buurten (bovenste laag - lijnen + arcering) */}
        {buurtenFeatures.length > 0 && (
          <GeoJSON
            key={`buurten-${buurtenFeatures.length}-${selectedBuurten?.join(',') || 'none'}`}
            data={{ type: 'FeatureCollection', features: buurtenFeatures }}
            style={buurtStyle}
            onEachFeature={(feature, layer) => {
              const naam = feature.properties?.buurtnaam || feature.properties?.buurtcode || 'Buurt';
              layer.bindTooltip(`Buurt: ${naam}`, {
                permanent: false,
                direction: 'top'
              });
            }}
          />
        )}
      </MapContainer>
      
      {/* Legend */}
      <div 
        className="absolute bottom-4 right-4 p-3 rounded-lg shadow-lg z-[1000]"
        style={{ background: 'white', maxWidth: '280px' }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: '#20423C' }}>
          Legenda
        </p>
        <div className="space-y-1.5">
          {/* Gemeente */}
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded border"
              style={{ 
                background: '#E5E7EB', 
                borderColor: '#9CA3AF',
                opacity: 0.5 
              }}
            />
            <span className="text-xs" style={{ color: '#6b7280' }}>
              Gemeente
            </span>
          </div>
          
          {/* Geselecteerde wijk */}
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded border-2"
              style={{ 
                background: 'transparent', 
                borderColor: '#20423C'
              }}
            />
            <span className="text-xs" style={{ color: '#6b7280' }}>
              Geselecteerde wijk (alleen lijn)
            </span>
          </div>
          
          {/* Geselecteerde buurt */}
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded border-2"
              style={{ 
                background: '#83AF9A', 
                borderColor: '#20423C',
                opacity: 0.6 
              }}
            />
            <span className="text-xs" style={{ color: '#6b7280' }}>
              Geselecteerde buurt (lijn + arcering)
            </span>
          </div>
        </div>
        
        {/* Statistieken */}
        <div className="mt-2 pt-2 border-t" style={{ borderColor: '#F3F3E2' }}>
          {gemeenteFeature && (
            <p className="text-xs mb-1" style={{ color: '#20423C' }}>
              ✓ Gemeente geladen
            </p>
          )}
          <p className="text-xs font-semibold" style={{ color: '#20423C' }}>
            {selectedWijkenWithGeo} wijken op kaart
            {totalSelectedWijken > 0 && ` van ${totalSelectedWijken}`}
          </p>
          <p className="text-xs font-semibold" style={{ color: '#20423C' }}>
            {selectedBuurtenWithGeo} buurten op kaart
            {totalSelectedBuurten > 0 && ` van ${totalSelectedBuurten}`}
          </p>
          {(missingWijkenGeo > 0 || missingBuurtenGeo > 0) && (
            <p className="text-xs mt-1" style={{ color: '#F97316' }}>
              ⚠️ {missingWijkenGeo + missingBuurtenGeo} zonder geometrie
            </p>
          )}
        </div>
        
        {/* Waarschuwing als geen geometrie */}
        {!hasGeometry && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: '#F3F3E2' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#DC2626' }}>
              ⚠️ Geen kaartdata beschikbaar
            </p>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              Selecteer een gemeente om de kaart te laden.
            </p>
          </div>
        )}
      </div>
      
      {/* Info banner als er codes zijn die niet matchen */}
      {(missingWijkenGeo > 0 || missingBuurtenGeo > 0) && (
        <div 
          className="absolute top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg shadow-lg z-[1000] max-w-md"
          style={{ background: '#FEF3C7' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>
            ℹ️ Niet alle gebieden zichtbaar op kaart
          </p>
          <p className="text-xs" style={{ color: '#78350F' }}>
            {missingWijkenGeo + missingBuurtenGeo} geselecteerde gebied(en) hebben geen geometrie data in de CBS database.
            De <strong>DATA</strong> en <strong>SCENARIO'S</strong> modules blijven wel volledig werken!
          </p>
        </div>
      )}
    </div>
  );
}