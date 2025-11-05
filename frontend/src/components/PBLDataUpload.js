import React, { useState } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';

export default function PBLDataUpload({ onDataLoaded, gemeenteNaam }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.zip')) {
      setError('Upload een .zip bestand van de PBL Startanalyse');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const zip = await JSZip.loadAsync(file);
      
      const files = {
        bebouwing: null,
        strategie: null,
        totaalbebouwing: null
      };

      for (const filename of Object.keys(zip.files)) {
        if (filename.includes('bebouwing.csv') && !filename.includes('totaal')) {
          files.bebouwing = await zip.files[filename].async('text');
        } else if (filename.includes('strategie.csv')) {
          files.strategie = await zip.files[filename].async('text');
        } else if (filename.includes('totaalbebouwing.csv')) {
          files.totaalbebouwing = await zip.files[filename].async('text');
        }
      }

      if (!files.bebouwing || !files.strategie || !files.totaalbebouwing) {
        throw new Error('ZIP bevat niet alle verwachte bestanden');
      }

      const parsedData = {
        bebouwing: Papa.parse(files.bebouwing, { 
          header: true, 
          dynamicTyping: true,
          skipEmptyLines: true
        }).data,
        strategie: Papa.parse(files.strategie, { 
          header: true, 
          dynamicTyping: true,
          skipEmptyLines: true
        }).data,
        totaalbebouwing: Papa.parse(files.totaalbebouwing, { 
          header: true, 
          dynamicTyping: true,
          skipEmptyLines: true
        }).data
      };

      const structuredData = transformPBLData(parsedData);
      onDataLoaded(structuredData);
      setSuccess(true);
      setUploading(false);

    } catch (err) {
      console.error('Error parsing PBL data:', err);
      setError(`Fout bij verwerken: ${err.message}`);
      setUploading(false);
    }
  };

  const transformPBLData = (raw) => {
    const data = {
      bebouwing: {},
      strategieen: {},
      totalen: {},
      metadata: {
        uploadDate: new Date().toISOString(),
        gemeente: gemeenteNaam
      }
    };

    raw.bebouwing.forEach(row => {
      const buurtcode = row.buurtcode || row.statcode;
      if (!buurtcode) return;
      
      data.bebouwing[buurtcode] = {
        buurtnaam: row.buurtnaam || row.statnaam,
        wijkcode: row.wijkcode,
        woningen_totaal: row.aantal_woningen || 0,
        eengezinswoning: row.eengezinswoning || 0,
        meergezinswoning: row.meergezinswoning || 0,
        bouwperiode_voor_1945: row.bouwperiode_voor_1945 || 0,
        bouwperiode_1945_1964: row.bouwperiode_1945_1964 || 0,
        bouwperiode_1965_1974: row.bouwperiode_1965_1974 || 0,
        bouwperiode_1975_1991: row.bouwperiode_1975_1991 || 0,
        bouwperiode_1992_2005: row.bouwperiode_1992_2005 || 0,
        bouwperiode_2006_2014: row.bouwperiode_2006_2014 || 0,
        bouwperiode_2015_later: row.bouwperiode_2015_later || 0,
        label_A: row.label_A || 0,
        label_B: row.label_B || 0,
        label_C: row.label_C || 0,
        label_D: row.label_D || 0,
        label_E: row.label_E || 0,
        label_F: row.label_F || 0,
        label_G: row.label_G || 0,
        utiliteit_totaal_oppervlak: row.utiliteit_totaal_oppervlak || 0,
        utiliteit_kantoor: row.utiliteit_kantoor || 0,
        utiliteit_winkel: row.utiliteit_winkel || 0,
        utiliteit_gezondheidszorg: row.utiliteit_gezondheidszorg || 0,
        utiliteit_onderwijs: row.utiliteit_onderwijs || 0,
        utiliteit_sport: row.utiliteit_sport || 0,
        utiliteit_logies: row.utiliteit_logies || 0,
        utiliteit_bijeenkomst: row.utiliteit_bijeenkomst || 0,
        utiliteit_industrie: row.utiliteit_industrie || 0,
        utiliteit_overig: row.utiliteit_overig || 0,
        _raw: row
      };
    });

    raw.strategie.forEach(row => {
      const buurtcode = row.buurtcode || row.statcode;
      if (!buurtcode) return;
      
      data.strategieen[buurtcode] = {
        buurtnaam: row.buurtnaam || row.statnaam,
        S1_label_B_nationale_kosten: row.S1_label_B_nationale_kosten || 0,
        S1_label_D_nationale_kosten: row.S1_label_D_nationale_kosten || 0,
        S1_energievraag: row.S1_energievraag || 0,
        S1_co2_reductie: 100,
        S2_label_B_nationale_kosten: row.S2_label_B_nationale_kosten || 0,
        S2_label_D_nationale_kosten: row.S2_label_D_nationale_kosten || 0,
        S2_energievraag: row.S2_energievraag || 0,
        S2_co2_reductie: 95,
        S3_label_B_nationale_kosten: row.S3_label_B_nationale_kosten || 0,
        S3_label_D_nationale_kosten: row.S3_label_D_nationale_kosten || 0,
        S3_energievraag: row.S3_energievraag || 0,
        S3_co2_reductie: 95,
        S4_label_B_nationale_kosten: row.S4_label_B_nationale_kosten || 0,
        S4_label_D_nationale_kosten: row.S4_label_D_nationale_kosten || 0,
        S4_energievraag: row.S4_energievraag || 0,
        S4_co2_reductie: 70,
        _raw: row
      };
    });

    raw.totaalbebouwing.forEach(row => {
      const buurtcode = row.buurtcode || row.statcode;
      if (!buurtcode) return;
      data.totalen[buurtcode] = row;
    });

    return data;
  };

  return (
    <div className="p-6 rounded-xl border-2" style={{ 
      background: 'white',
      borderColor: '#F3F3E2'
    }}>
      <h3 className="font-bold text-lg mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
        📊 PBL Startanalyse Upload
      </h3>
      
      <div className="mb-4 text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
        <p className="mb-2">
          Upload het .zip bestand van de <strong>PBL Startanalyse 2025</strong> voor {gemeenteNaam}.
        </p>
        <p className="text-xs italic">
          Download via: <a href="https://startanalyse.pbl.nl/gemeentedata" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#83AF9A' }}>startanalyse.pbl.nl/gemeentedata</a>
        </p>
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center" 
        style={{ 
          borderColor: success ? '#83AF9A' : '#F3F3E2',
          background: success ? 'rgba(131, 175, 154, 0.1)' : 'transparent'
        }}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleZipUpload}
          disabled={uploading}
          className="hidden"
          id="pbl-upload"
        />
        
        <label htmlFor="pbl-upload" className="cursor-pointer flex flex-col items-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={success ? '#83AF9A' : '#6b7280'} strokeWidth="2" className="mb-3">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          
          {uploading && (
            <div className="mb-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#83AF9A' }}></div>
            </div>
          )}
          
          {success ? (
            <div>
              <p className="font-semibold mb-1" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
                ✓ PBL data succesvol geladen
              </p>
              <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                Upload een nieuw bestand om te vervangen
              </p>
            </div>
          ) : (
            <div>
              <p className="font-semibold mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                {uploading ? 'Bezig met verwerken...' : 'Klik om bestand te selecteren'}
              </p>
              <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                of sleep het bestand hierheen
              </p>
            </div>
          )}
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <p className="text-sm font-semibold" style={{ color: '#dc2626', fontFamily: 'Raleway, sans-serif' }}>
            ⚠️ {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(131, 175, 154, 0.1)' }}>
          <p className="text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            💡 <strong>Tip:</strong> Bekijk nu de andere tabs om PBL strategieën en bebouwingsdata te verkennen.
          </p>
        </div>
      )}
    </div>
  );
}