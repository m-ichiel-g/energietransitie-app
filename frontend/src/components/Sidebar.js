import React, { useState, useMemo } from 'react';
import { Search, MapPin, Filter, X, Loader, AlertCircle } from 'lucide-react';
import {
  getStrategieData,
  berekenCO2Reductie,
  getStrategieCodeFromKolom,
  getStrategieLabelFromKolom,
  getStrategieColor,
  getStrategieIcon,
  filterStrategies,
  sortStrategiesForDisplay,
  formatEuro
} from './utils/scenarioCalculations';

// PBL Gemeenten lijst (uit bijgevoegd document)
const PBL_GEMEENTEN = [
  "Aa en Hunze", "Aalsmeer", "Aalten", "Achtkarspelen", "Alblasserdam", "Albrandswaard",
  "Alkmaar", "Almelo", "Almere", "Alphen aan den Rijn", "Alphen-Chaam", "Altena",
  "Amersfoort", "Amstelveen", "Amsterdam", "Apeldoorn", "Arnhem", "Assen", "Asten",
  "Baarle-Nassau", "Baarn", "Barendrecht", "Barneveld", "Beek", "Beekdaelen", "Beesel",
  "Berg en Dal", "Bergeijk", "Bergen (L.)", "Bergen (NH.)", "Bergen op Zoom", "Berkelland",
  "Bernheze", "Best", "Beuningen", "Beverwijk", "Bladel", "Blaricum", "Bloemendaal",
  "Bodegraven-Reeuwijk", "Boekel", "Borger-Odoorn", "Borne", "Borsele", "Boxtel", "Breda",
  "Bronckhorst", "Brummen", "Brunssum", "Bunnik", "Bunschoten", "Buren",
  "Capelle aan den IJssel", "Castricum", "Coevorden", "Cranendonck", "Culemborg",
  "Dalfsen", "Dantumadiel", "De Bilt", "De Fryske Marren", "De Ronde Venen", "De Wolden",
  "Delft", "Den Helder", "Deurne", "Deventer", "Diemen", "Dijk en Waard", "Dinkelland",
  "Doesburg", "Doetinchem", "Dongen", "Dordrecht", "Drechterland", "Drimmelen", "Dronten",
  "Druten", "Duiven", "Echt-Susteren", "Edam-Volendam", "Ede", "Eemnes", "Eemsdelta",
  "Eersel", "Eijsden-Margraten", "Eindhoven", "Elburg", "Emmen", "Enkhuizen", "Enschede",
  "Epe", "Ermelo", "Etten-Leur", "Geertruidenberg", "Geldrop-Mierlo", "Gemert-Bakel",
  "Gennep", "Gilze en Rijen", "Goeree-Overflakkee", "Goes", "Goirle", "Gooise Meren",
  "Gorinchem", "Gouda", "Groningen", "Gulpen-Wittem", "Haaksbergen", "Haarlem",
  "Haarlemmermeer", "Halderberge", "Hardenberg", "Harderwijk", "Hardinxveld-Giessendam",
  "Harlingen", "Hattem", "Heemskerk", "Heemstede", "Heerde", "Heerenveen", "Heerlen",
  "Heeze-Leende", "Heiloo", "Hellendoorn", "Helmond", "Hendrik-Ido-Ambacht", "Hengelo",
  "Het Hogeland", "Heumen", "Heusden", "Hillegom", "Hilvarenbeek", "Hilversum",
  "Hoeksche Waard", "Hof van Twente", "Hollands Kroon", "Hoogeveen", "Hoorn",
  "Horst aan de Maas", "Houten", "Huizen", "Hulst", "IJsselstein", "Kaag en Braassem",
  "Kampen", "Kapelle", "Katwijk", "Kerkrade", "Koggenland", "Krimpen aan den IJssel",
  "Krimpenerwaard", "Laarbeek", "Land van Cuijk", "Landgraaf", "Landsmeer", "Lansingerland",
  "Laren", "Leeuwarden", "Leiden", "Leiderdorp", "Leidschendam-Voorburg", "Lelystad",
  "Leudal", "Leusden", "Lingewaard", "Lisse", "Lochem", "Loon op Zand", "Lopik", "Losser",
  "Maasdriel", "Maasgouw", "Maashorst", "Maassluis", "Maastricht", "Medemblik", "Meerssen",
  "Meierijstad", "Meppel", "Middelburg", "Midden-Delfland", "Midden-Drenthe",
  "Midden-Groningen", "Moerdijk", "Molenlanden", "Montferland", "Montfoort",
  "Mook en Middelaar", "Neder-Betuwe", "Nederweert", "Nieuwegein", "Nieuwkoop", "Nijkerk",
  "Nijmegen", "Nissewaard", "Noardeast-Fryslan", "Noord-Beveland", "Noordenveld",
  "Noordoostpolder", "Noordwijk", "Nuenen Gerwen en Nederwetten", "Nunspeet", "Oegstgeest",
  "Oirschot", "Oisterwijk", "Oldambt", "Oldebroek", "Oldenzaal", "Olst-Wijhe", "Ommen",
  "Oost Gelre", "Oosterhout", "Ooststellingwerf", "Oostzaan", "Opmeer", "Opsterland", "Oss",
  "Oude IJsselstreek", "Ouder-Amstel", "Oudewater", "Overbetuwe", "Papendrecht",
  "Peel en Maas", "Pekela", "Pijnacker-Nootdorp", "Purmerend", "Putten", "Raalte",
  "Reimerswaal", "Renkum", "Renswoude", "Reusel-De Mierden", "Rheden", "Rhenen",
  "Ridderkerk", "Rijssen-Holten", "Rijswijk", "Roerdalen", "Roermond", "Roosendaal",
  "Rotterdam", "Rozendaal", "Rucphen", "Schagen", "Scherpenzeel", "Schiedam",
  "Schiermonnikoog", "Schouwen-Duiveland", "Simpelveld", "Sint-Michielsgestel",
  "Sittard-Geleen", "Sliedrecht", "Sluis", "Smallingerland", "Soest", "Someren",
  "Son en Breugel", "Stadskanaal", "Staphorst", "Stede Broec", "Steenbergen",
  "Steenwijkerland", "Stein", "Stichtse Vecht", "Sudwest-Fryslan", "'s-Gravenhage",
  "'s-Hertogenbosch", "Terneuzen", "Terschelling", "Texel", "Teylingen", "Tholen", "Tiel",
  "Tilburg", "Tubbergen", "Twenterand", "Tynaarlo", "Tytsjerksteradiel", "Uitgeest",
  "Uithoorn", "Urk", "Utrecht", "Utrechtse Heuvelrug", "Vaals", "Valkenburg aan de Geul",
  "Valkenswaard", "Veendam", "Veenendaal", "Veere", "Veldhoven", "Velsen", "Venlo", "Venray",
  "Vijfheerenlanden", "Vlaardingen", "Vlieland", "Vlissingen", "Voerendaal", "Voorne aan Zee",
  "Voorschoten", "Voorst", "Vught", "Waadhoeke", "Waalre", "Waalwijk", "Waddinxveen",
  "Wageningen", "Wassenaar", "Waterland", "Weert", "West Betuwe", "West Maas en Waal",
  "Westerkwartier", "Westerveld", "Westervoort", "Westerwolde", "Westland",
  "Weststellingwerf", "Wierden", "Wijchen", "Wijdemeren", "Wijk bij Duurstede", "Winterswijk",
  "Woensdrecht", "Woerden", "Wormerland", "Woudenberg", "Zaanstad", "Zaltbommel", "Zandvoort",
  "Zeewolde", "Zeist", "Zevenaar", "Zoetermeer", "Zoeterwoude", "Zuidplas", "Zundert",
  "Zutphen", "Zwartewaterland", "Zwijndrecht", "Zwolle"
];

/**
 * Sidebar - Gebied/Filter tabs
 */
export default function Sidebar({
  activeTab,
  onTabChange,
  selectedGemeente,
  selectedWijken,
  selectedBuurten,
  pblData,
  onGemeenteSelect,
  onWijkToggle,
  onBuurtToggle,
  onReset,
  isLoadingZip,
  loadingError,
  onManualZipUpload,  // Nieuwe prop voor manual upload
  baselineJaar,
  setBaselineJaar,
  selectedStrategies,
  setSelectedStrategies,
  scenarioFilters,
  setScenarioFilters
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter gemeenten
  const filteredGemeenten = PBL_GEMEENTEN.filter(g =>
    g.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 20);

  // Bereken scenario comparisons voor filter tab
  const strategieComparisons = useMemo(() => {
    if (!pblData || !selectedBuurten || selectedBuurten.length === 0) return [];

    const buurtenList = selectedBuurten
      .map(code => pblData.buurten[code])
      .filter(b => b && b.strategieMatrix);

    if (buurtenList.length === 0) return [];

    const baselineKolom = baselineJaar === '2023' ? 'Referentie_2023' : 'Referentie_2030';
    const baselineData = getStrategieData(buurtenList, baselineKolom);

    let kolommen = pblData.strategieKolommen || [];
    if (scenarioFilters.schillabel) {
      kolommen = filterStrategies(kolommen, { schillabel: scenarioFilters.schillabel });
    }
    if (!scenarioFilters.toonVarianten) {
      kolommen = kolommen.filter(k =>
        k.startsWith('Strategie_') ||
        k.includes('Referentie') ||
        k.includes('Laagste_Nationale_Kosten')
      );
    }
    kolommen = sortStrategiesForDisplay(kolommen);

    return kolommen.map(kolom => {
      const data = getStrategieData(buurtenList, kolom);
      const code = getStrategieCodeFromKolom(kolom);
      const co2Reductie = berekenCO2Reductie(data, baselineData);

      return {
        kolom,
        code,
        label: getStrategieLabelFromKolom(kolom),
        color: getStrategieColor(code),
        icon: getStrategieIcon(code),
        co2Reductie,
        metrics: {
          kostenPerTon: data.gemiddeldes?.H17_Nat_meerkost_CO2 || 0
        }
      };
    });
  }, [pblData, selectedBuurten, baselineJaar, scenarioFilters]);

  return (
    <div
      className="flex flex-col h-full border-r shadow-lg"
      style={{ width: '320px', background: 'white', borderColor: '#F3F3E2' }}
    >
      {/* TABS */}
      <div className="flex border-b" style={{ borderColor: '#F3F3E2' }}>
        <button
          onClick={() => onTabChange('gebied')}
          className="flex-1 px-4 py-3 font-semibold text-sm transition-all duration-200"
          style={{
            background: activeTab === 'gebied' ? '#83AF9A' : 'white',
            color: activeTab === 'gebied' ? 'white' : '#20423C',
            borderBottom: activeTab === 'gebied' ? 'none' : `2px solid #F3F3E2`
          }}
        >
          <MapPin size={18} className="inline mr-2" />
          Selecteer Gebied
        </button>

      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'gebied' && (
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3" size={18} style={{ color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Zoek gemeente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border-2 transition-all"
                style={{
                  borderColor: searchQuery ? '#83AF9A' : '#F3F3E2',
                  outline: 'none'
                }}
              />
            </div>

            {/* Loading */}
            {isLoadingZip && (
              <div className="flex items-center p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                <Loader className="animate-spin mr-2" size={18} style={{ color: '#F59E0B' }} />
                <span className="text-sm" style={{ color: '#92400E' }}>
                  ZIP downloaden...
                </span>
              </div>
            )}

            {/* Error */}
            {loadingError && (
              <div className="space-y-3">
                <div className="flex items-start p-3 rounded-lg" style={{ background: '#FEE2E2' }}>
                  <AlertCircle className="mr-2 flex-shrink-0 mt-0.5" size={18} style={{ color: '#DC2626' }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1" style={{ color: '#991B1B' }}>
                      Download mislukt
                    </p>
                    <p className="text-xs whitespace-pre-line" style={{ color: '#7F1D1D' }}>
                      {loadingError}
                    </p>
                  </div>
                </div>
                
                {/* Manual upload optie */}
                {loadingError.includes('CORS') && (
                  <div className="p-3 rounded-lg border-2 border-dashed" style={{ borderColor: '#83AF9A', background: '#F0FDF4' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#166534' }}>
                      📁 Upload ZIP handmatig:
                    </p>
                    <label className="block">
                      <input
                        type="file"
                        accept=".zip"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && onManualZipUpload) {
                            onManualZipUpload(file);
                          }
                        }}
                        className="block w-full text-xs file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:cursor-pointer"
                        style={{
                          color: '#20423C',
                          'file:background': '#83AF9A',
                          'file:color': 'white'
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Gemeente lijst */}
            {!selectedGemeente && searchQuery && (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredGemeenten.map((gem, idx) => (
                  <button
                    key={idx}
                    onClick={() => onGemeenteSelect({ naam: gem })}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:shadow-md"
                    style={{
                      background: '#F9FAFB',
                      color: '#20423C'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#83AF9A20'}
                    onMouseLeave={(e) => e.target.style.background = '#F9FAFB'}
                  >
                    {gem}
                  </button>
                ))}
              </div>
            )}

            {/* Selected gemeente */}
            {selectedGemeente && pblData && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ background: '#DCFCE7' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-sm" style={{ color: '#166534' }}>
                      {selectedGemeente.naam}
                    </p>
                    <button
                      onClick={onReset}
                      className="p-1 rounded hover:bg-red-100 transition-colors"
                    >
                      <X size={16} style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span style={{ color: '#6b7280' }}>Buurten: </span>
                      <span className="font-semibold" style={{ color: '#166534' }}>
                        {pblData.metadata.aantalBuurten}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Wijken: </span>
                      <span className="font-semibold" style={{ color: '#166534' }}>
                        {pblData.metadata.aantalWijken}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Wijken/Buurten selectie */}
                <div className="space-y-3">
                  {/* Wijken */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                        Wijken ({pblData.wijkenList.length})
                      </p>
                      <button
                        onClick={() => {
                          const allSelected = selectedWijken.length === pblData.wijkenList.length;
                          
                          if (allSelected) {
                            // Deselect alle wijken (dit deselect ook buurten via handler)
                            selectedWijken.forEach(wijk => onWijkToggle(wijk));
                          } else {
                            // Select alle wijken (dit select ook buurten via handler)
                            pblData.wijkenList.forEach(wijk => {
                              if (!selectedWijken.includes(wijk)) {
                                onWijkToggle(wijk);
                              }
                            });
                          }
                        }}
                        className="text-xs px-2 py-1 rounded transition-colors"
                        style={{
                          background: '#F3F3E2',
                          color: '#20423C'
                        }}
                      >
                        {selectedWijken.length === pblData.wijkenList.length ? 'Geen' : 'Alle'}
                      </button>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {pblData.wijkenList.map((wijkcode, idx) => {
                        const wijkData = pblData.wijkenData?.get(wijkcode);
                        const wijkNaam = wijkData?.naam || wijkcode;
                        const buurtenInWijk = pblData.buurtenList.filter(b => b.wijkcode === wijkcode);
                        const isSelected = selectedWijken.includes(wijkcode);
                        
                        return (
                          <div key={idx} className="space-y-1">
                            <label
                              className="flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all"
                              style={{
                                background: isSelected ? '#DCFCE7' : '#F9FAFB'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onWijkToggle(wijkcode)}
                                className="rounded"
                                style={{ accentColor: '#83AF9A' }}
                              />
                              <div className="flex-1">
                                <p className="text-xs font-semibold" style={{ color: '#20423C' }}>
                                  {wijkNaam}
                                </p>
                                <p className="text-xs" style={{ color: '#6b7280' }}>
                                  {wijkcode} · {buurtenInWijk.length} buurten
                                </p>
                              </div>
                            </label>
                            
                            {/* Buurten in deze wijk */}
                            {isSelected && (
                              <div className="ml-6 space-y-1">
                                {buurtenInWijk.slice(0, 10).map((buurt, bidx) => (
                                  <label
                                    key={bidx}
                                    className="flex items-center space-x-2 p-1.5 rounded cursor-pointer transition-all text-xs"
                                    style={{
                                      background: selectedBuurten.includes(buurt.code) ? '#83AF9A20' : 'transparent'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedBuurten.includes(buurt.code)}
                                      onChange={() => onBuurtToggle(buurt.code)}
                                      className="rounded"
                                      style={{ accentColor: '#83AF9A' }}
                                    />
                                    <span style={{ color: '#20423C' }}>
                                      {buurt.naam}
                                    </span>
                                  </label>
                                ))}
                                {buurtenInWijk.length > 10 && (
                                  <p className="text-xs ml-6" style={{ color: '#6b7280' }}>
                                    + {buurtenInWijk.length - 10} meer...
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'filter' && (
          <div className="p-4 space-y-4">
            {/* Baseline */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>
                Baseline:
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setBaselineJaar('2023')}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: baselineJaar === '2023' ? '#83AF9A' : '#F3F3E2',
                    color: baselineJaar === '2023' ? 'white' : '#20423C'
                  }}
                >
                  2023
                </button>
                <button
                  onClick={() => setBaselineJaar('2030')}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: baselineJaar === '2030' ? '#83AF9A' : '#F3F3E2',
                    color: baselineJaar === '2030' ? 'white' : '#20423C'
                  }}
                >
                  2030
                </button>
              </div>
            </div>

            {pblData && (
              <>
                {/* Schillabel */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>
                    Schillabel:
                  </label>
                  <div className="flex space-x-2">
                    {['Alle', 'B+', 'D+'].map(label => (
                      <button
                        key={label}
                        onClick={() => setScenarioFilters(f => ({ ...f, schillabel: label === 'Alle' ? null : label }))}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: (label === 'Alle' && !scenarioFilters.schillabel) || scenarioFilters.schillabel === label ? '#83AF9A' : '#F3F3E2',
                          color: (label === 'Alle' && !scenarioFilters.schillabel) || scenarioFilters.schillabel === label ? 'white' : '#20423C'
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Varianten */}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scenarioFilters.toonVarianten}
                    onChange={(e) => setScenarioFilters(f => ({ ...f, toonVarianten: e.target.checked }))}
                    className="rounded"
                    style={{ accentColor: '#83AF9A' }}
                  />
                  <span className="text-xs font-semibold" style={{ color: '#20423C' }}>
                    Toon alle varianten
                  </span>
                </label>

                {/* Scenario list */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {strategieComparisons.map((strat, idx) => (
                    <label
                      key={idx}
                      className="flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: selectedStrategies.includes(strat.kolom) ? `${strat.color}15` : '#F9FAFB',
                        border: `2px solid ${selectedStrategies.includes(strat.kolom) ? strat.color : '#F3F3E2'}`
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStrategies.includes(strat.kolom)}
                        onChange={() => setSelectedStrategies(prev =>
                          prev.includes(strat.kolom) ? prev.filter(k => k !== strat.kolom) : [...prev, strat.kolom]
                        )}
                        className="rounded"
                        style={{ accentColor: strat.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#20423C' }}>
                          {strat.icon} {strat.label.split(':')[0]}
                        </p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>
                          {formatEuro(strat.metrics.kostenPerTon, true)}/ton
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {!pblData && (
              <p className="text-xs text-center" style={{ color: '#6b7280' }}>
                Selecteer eerst een gemeente
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}