import React, { useMemo } from 'react';
import { Home, Building2, Calendar, Zap } from 'lucide-react';

export default function PBLBebouwingDetail({ 
  pblData, 
  selectedBuurten, 
  getGebiedNaam 
}) {
  // Bereken totalen over geselecteerde buurten
  const totalen = useMemo(() => {
    if (!pblData || selectedBuurten.length === 0) return null;

    const result = {
      woningen_totaal: 0,
      eengezinswoning: 0,
      meergezinswoning: 0,
      
      bouwperiodes: {
        voor_1945: 0,
        _1945_1964: 0,
        _1965_1974: 0,
        _1975_1991: 0,
        _1992_2005: 0,
        _2006_2014: 0,
        _2015_later: 0
      },
      
      labels: {
        A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0
      },
      
      utiliteit: {
        totaal: 0,
        kantoor: 0,
        winkel: 0,
        gezondheidszorg: 0,
        onderwijs: 0,
        sport: 0,
        logies: 0,
        bijeenkomst: 0,
        industrie: 0,
        overig: 0
      }
    };

    selectedBuurten.forEach(buurtCode => {
      const bebouwing = pblData.bebouwing[buurtCode];
      if (!bebouwing) return;

      result.woningen_totaal += bebouwing.woningen_totaal || 0;
      result.eengezinswoning += bebouwing.eengezinswoning || 0;
      result.meergezinswoning += bebouwing.meergezinswoning || 0;

      // Bouwperiodes
      result.bouwperiodes.voor_1945 += bebouwing.bouwperiode_voor_1945 || 0;
      result.bouwperiodes._1945_1964 += bebouwing.bouwperiode_1945_1964 || 0;
      result.bouwperiodes._1965_1974 += bebouwing.bouwperiode_1965_1974 || 0;
      result.bouwperiodes._1975_1991 += bebouwing.bouwperiode_1975_1991 || 0;
      result.bouwperiodes._1992_2005 += bebouwing.bouwperiode_1992_2005 || 0;
      result.bouwperiodes._2006_2014 += bebouwing.bouwperiode_2006_2014 || 0;
      result.bouwperiodes._2015_later += bebouwing.bouwperiode_2015_later || 0;

      // Labels
      result.labels.A += bebouwing.label_A || 0;
      result.labels.B += bebouwing.label_B || 0;
      result.labels.C += bebouwing.label_C || 0;
      result.labels.D += bebouwing.label_D || 0;
      result.labels.E += bebouwing.label_E || 0;
      result.labels.F += bebouwing.label_F || 0;
      result.labels.G += bebouwing.label_G || 0;

      // Utiliteit
      result.utiliteit.totaal += bebouwing.utiliteit_totaal_oppervlak || 0;
      result.utiliteit.kantoor += bebouwing.utiliteit_kantoor || 0;
      result.utiliteit.winkel += bebouwing.utiliteit_winkel || 0;
      result.utiliteit.gezondheidszorg += bebouwing.utiliteit_gezondheidszorg || 0;
      result.utiliteit.onderwijs += bebouwing.utiliteit_onderwijs || 0;
      result.utiliteit.sport += bebouwing.utiliteit_sport || 0;
      result.utiliteit.logies += bebouwing.utiliteit_logies || 0;
      result.utiliteit.bijeenkomst += bebouwing.utiliteit_bijeenkomst || 0;
      result.utiliteit.industrie += bebouwing.utiliteit_industrie || 0;
      result.utiliteit.overig += bebouwing.utiliteit_overig || 0;
    });

    return result;
  }, [pblData, selectedBuurten]);

  if (!pblData || selectedBuurten.length === 0 || !totalen) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Selecteer eerst buurten op de kaart om bebouwingsdata te zien
        </p>
      </div>
    );
  }

  const BarChart = ({ data, color = '#83AF9A', maxValue = null }) => {
    const max = maxValue || Math.max(...Object.values(data));
    
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          const percentage = max > 0 ? (value / max) * 100 : 0;
          const displayLabel = key.replace(/_/g, ' ').replace(/(\d{4})/g, '$1');
          
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                  {displayLabel}
                </span>
                <span className="text-xs font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  {value.toLocaleString('nl-NL')}
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const woningequivalenten = Math.round(totalen.utiliteit.totaal / 130);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.2) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold text-lg mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          🏘️ Bebouwingskenmerken
        </h3>
        <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          PBL Startanalyse data voor <span className="font-bold" style={{ color: '#20423C' }}>{selectedBuurten.length}</span> geselecteerde buurten
        </p>
      </div>

      {/* Woningen totaal */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'white',
          borderColor: '#83AF9A'
        }}>
          <div className="flex items-center justify-between mb-2">
            <Home size={24} color="#83AF9A" />
            <span className="text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              WONINGEN
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            {totalen.woningen_totaal.toLocaleString('nl-NL')}
          </p>
        </div>

        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'white',
          borderColor: '#6f9884'
        }}>
          <div className="flex items-center justify-between mb-2">
            <Building2 size={24} color="#6f9884" />
            <span className="text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              UTILITEIT (weq)
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            {woningequivalenten.toLocaleString('nl-NL')}
          </p>
          <p className="text-xs mt-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
            {totalen.utiliteit.totaal.toLocaleString('nl-NL')} m²
          </p>
        </div>

        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'white',
          borderColor: '#20423C'
        }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">∑</span>
            <span className="text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              TOTAAL (weq)
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            {(totalen.woningen_totaal + woningequivalenten).toLocaleString('nl-NL')}
          </p>
        </div>
      </div>

      {/* Woningtypen */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h4 className="font-bold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          <Home size={20} className="mr-2" />
          Woningtypen
        </h4>
        <BarChart 
          data={{
            Eengezinswoningen: totalen.eengezinswoning,
            Meergezinswoningen: totalen.meergezinswoning
          }}
          color="#83AF9A"
        />
      </div>

      {/* Bouwperiodes */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h4 className="font-bold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          <Calendar size={20} className="mr-2" />
          Bouwperiode
        </h4>
        <BarChart 
          data={{
            'Voor 1945': totalen.bouwperiodes.voor_1945,
            '1945-1964': totalen.bouwperiodes._1945_1964,
            '1965-1974': totalen.bouwperiodes._1965_1974,
            '1975-1991': totalen.bouwperiodes._1975_1991,
            '1992-2005': totalen.bouwperiodes._1992_2005,
            '2006-2014': totalen.bouwperiodes._2006_2014,
            '2015 of later': totalen.bouwperiodes._2015_later
          }}
          color="#6f9884"
        />
      </div>

      {/* Energielabels */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h4 className="font-bold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          <Zap size={20} className="mr-2" />
          Energielabels
        </h4>
        <BarChart 
          data={totalen.labels}
          color="#83AF9A"
        />
      </div>

      {/* Utiliteit detail */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h4 className="font-bold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          <Building2 size={20} className="mr-2" />
          Utiliteitsbouw per functie (m²)
        </h4>
        <BarChart 
          data={{
            Kantoor: totalen.utiliteit.kantoor,
            Winkel: totalen.utiliteit.winkel,
            Gezondheidszorg: totalen.utiliteit.gezondheidszorg,
            Onderwijs: totalen.utiliteit.onderwijs,
            Sport: totalen.utiliteit.sport,
            Logies: totalen.utiliteit.logies,
            Bijeenkomst: totalen.utiliteit.bijeenkomst,
            Industrie: totalen.utiliteit.industrie,
            Overig: totalen.utiliteit.overig
          }}
          color="#20423C"
        />
      </div>
    </div>
  );
}