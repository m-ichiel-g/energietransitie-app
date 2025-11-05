import React, { useState } from 'react';
import { Upload, FileArchive, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import JSZip from 'jszip';
import Papa from 'papaparse';

/**
 * ScenarioUpload Component
 * Handles ZIP file upload and parsing of PBL CSV data
 */
export default function ScenarioUpload({ onDataParsed, existingData }) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const zipFiles = files.filter(file => file.name.endsWith('.zip'));
    
    if (zipFiles.length > 0) {
      setUploadedFiles(zipFiles);
      processZipFile(zipFiles[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    const zipFiles = files.filter(file => file.name.endsWith('.zip'));
    
    if (zipFiles.length > 0) {
      setUploadedFiles(zipFiles);
      processZipFile(zipFiles[0]);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    onDataParsed(null);
  };

  const processZipFile = async (file) => {
    setIsProcessing(true);
    setProcessingError(null);
    
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Zoek de 3 CSV bestanden
      let strategieFile = null;
      let bebouwingFile = null;
      let totaalFile = null;
      
      zipContent.forEach((relativePath, file) => {
        if (relativePath.includes('strategie') && relativePath.endsWith('.csv')) {
          strategieFile = file;
        } else if (relativePath.includes('bebouwing') && !relativePath.includes('totaal') && relativePath.endsWith('.csv')) {
          bebouwingFile = file;
        } else if (relativePath.includes('totaalbebouwing') && relativePath.endsWith('.csv')) {
          totaalFile = file;
        }
      });
      
      if (!strategieFile || !bebouwingFile || !totaalFile) {
        throw new Error('Niet alle verwachte CSV bestanden gevonden in ZIP');
      }
      
      // Parse alle 3 CSVs
      const strategieText = await strategieFile.async('text');
      const bebouwingText = await bebouwingFile.async('text');
      const totaalText = await totaalFile.async('text');
      
      // Parse opties
      const parseOptions = {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => {
          if (typeof value === 'string') {
            const cleaned = value.replace(',', '.');
            const num = parseFloat(cleaned);
            return isNaN(num) ? value : num;
          }
          return value;
        }
      };
      
      const strategieData = Papa.parse(strategieText, parseOptions);
      const bebouwingData = Papa.parse(bebouwingText, parseOptions);
      const totaalData = Papa.parse(totaalText, parseOptions);
      
      console.log('📦 Strategie parsed:', strategieData.data.length, 'rijen');
      
      // Organiseer data per buurtcode
      const dataPerBuurt = {};
      
      // 1. Totaalbebouwing
      totaalData.data.forEach(row => {
        const buurtcode = row.I01_buurtcode;
        if (buurtcode) {
          dataPerBuurt[buurtcode] = {
            totaal: row,
            strategie: null,
            strategieMatrix: {},
            bebouwing: []
          };
        }
      });
      
      // 2. Strategie CSV - MATRIX structuur
      const strategiePerBuurt = {};
      strategieData.data.forEach(row => {
        const buurtcode = row.I01_buurtcode;
        if (!buurtcode) return;
        
        if (!strategiePerBuurt[buurtcode]) {
          strategiePerBuurt[buurtcode] = [];
        }
        strategiePerBuurt[buurtcode].push(row);
      });
      
      console.log('🎯 Aantal buurten in strategie:', Object.keys(strategiePerBuurt).length);
      
      // Verwerk elke buurt
      Object.keys(strategiePerBuurt).forEach(buurtcode => {
        if (!dataPerBuurt[buurtcode]) {
          dataPerBuurt[buurtcode] = {
            totaal: null,
            strategie: null,
            strategieMatrix: {},
            bebouwing: []
          };
        }
        
        const rows = strategiePerBuurt[buurtcode];
        const heeftCodeIndicator = rows.some(r => r.Code_Indicator);
        
        if (heeftCodeIndicator) {
          // BASIS INFO
          const basisRow = rows.find(r => !r.Code_Indicator || r.Code_Indicator === '');
          if (basisRow) {
            dataPerBuurt[buurtcode].strategie = basisRow;
          }
          
          // MATRIX ROWS
          const matrixRows = rows.filter(r => r.Code_Indicator && r.Code_Indicator !== '');
          
          // Vind strategie kolommen
          const alleKolommen = Object.keys(matrixRows[0] || {});
          const strategieKolommen = alleKolommen.filter(k => 
            !['I01_buurtcode', 'I02_buurtnaam', 'Code_Indicator', 'Indicator_Label'].includes(k) &&
            k !== ''
          );
          
          console.log('📊 Strategie kolommen gevonden:', strategieKolommen.length);
          
          // Bouw matrix: { indicator: { kolom: waarde } }
          matrixRows.forEach(row => {
            const indicator = row.Code_Indicator;
            if (!indicator) return;
            
            dataPerBuurt[buurtcode].strategieMatrix[indicator] = {};
            
            strategieKolommen.forEach(kolom => {
              const waarde = row[kolom];
              dataPerBuurt[buurtcode].strategieMatrix[indicator][kolom] = waarde;
            });
          });
          
          // Bewaar beschikbare kolommen
          dataPerBuurt[buurtcode].strategieKolommen = strategieKolommen;
        }
      });
      
      // 3. Bebouwing CSV
      bebouwingData.data.forEach(row => {
        const buurtcode = row.I01_buurtcode;
        if (buurtcode && dataPerBuurt[buurtcode]) {
          dataPerBuurt[buurtcode].bebouwing.push(row);
        }
      });
      
      // Haal alle unieke strategie kolommen op (uit eerste buurt met data)
      const eersteBuurtMetData = Object.values(dataPerBuurt).find(b => 
        b.strategieKolommen && b.strategieKolommen.length > 0
      );
      
      const strategieKolommen = eersteBuurtMetData?.strategieKolommen || [];
      
      console.log('✅ Parsing compleet!');
      console.log('   Buurten:', Object.keys(dataPerBuurt).length);
      console.log('   Strategiekolommen:', strategieKolommen.length);
      
      // Geef data terug aan parent
      const parsedData = {
        buurten: dataPerBuurt,
        strategieKolommen: strategieKolommen,
        metadata: {
          aantalBuurten: Object.keys(dataPerBuurt).length,
          aantalStrategieKolommen: strategieKolommen.length,
          parseDate: new Date().toISOString()
        }
      };
      
      onDataParsed(parsedData);
      
    } catch (error) {
      console.error('❌ Fout bij verwerken ZIP:', error);
      setProcessingError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {!existingData && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="border-2 border-dashed rounded-xl p-8 text-center transition-all"
          style={{
            borderColor: isDragging ? '#83AF9A' : '#F3F3E2',
            background: isDragging ? 'rgba(131, 175, 154, 0.1)' : 'white'
          }}
        >
          <Upload 
            size={48} 
            className="mx-auto mb-4" 
            style={{ color: '#83AF9A' }}
          />
          <h3 className="text-lg font-bold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            Upload PBL Scenario Data
          </h3>
          <p className="text-sm mb-4" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
            Sleep een ZIP bestand hierheen of klik om te selecteren
          </p>
          <label className="inline-block px-6 py-2 rounded-lg font-semibold cursor-pointer transition-all"
            style={{ 
              background: '#83AF9A',
              color: 'white',
              fontFamily: 'Raleway, sans-serif'
            }}
            onMouseEnter={(e) => e.target.style.background = '#6d9380'}
            onMouseLeave={(e) => e.target.style.background = '#83AF9A'}
          >
            Selecteer ZIP bestand
            <input
              type="file"
              accept=".zip"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center p-4 rounded-lg" style={{ background: '#FEF3C7' }}>
          <Loader className="animate-spin mr-2" size={20} style={{ color: '#F59E0B' }} />
          <span style={{ color: '#92400E', fontFamily: 'Raleway, sans-serif' }}>
            ZIP bestand wordt verwerkt...
          </span>
        </div>
      )}

      {/* Error message */}
      {processingError && (
        <div className="flex items-start p-4 rounded-lg" style={{ background: '#FEE2E2' }}>
          <AlertCircle className="mr-2 flex-shrink-0" size={20} style={{ color: '#DC2626' }} />
          <div>
            <p className="font-semibold" style={{ color: '#991B1B', fontFamily: 'Raleway, sans-serif' }}>
              Fout bij verwerken
            </p>
            <p className="text-sm" style={{ color: '#7F1D1D', fontFamily: 'Raleway, sans-serif' }}>
              {processingError}
            </p>
          </div>
        </div>
      )}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: '#F3F3E2' }}
            >
              <div className="flex items-center space-x-3">
                <FileArchive size={24} style={{ color: '#83AF9A' }} />
                <div>
                  <p className="font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {file.name}
                  </p>
                  <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {existingData && (
                  <CheckCircle size={20} style={{ color: '#10B981' }} />
                )}
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <X size={20} style={{ color: '#EF4444' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data summary */}
      {existingData && (
        <div className="p-4 rounded-lg" style={{ background: '#DCFCE7' }}>
          <div className="flex items-center mb-2">
            <CheckCircle className="mr-2" size={20} style={{ color: '#10B981' }} />
            <p className="font-semibold" style={{ color: '#166534', fontFamily: 'Raleway, sans-serif' }}>
              Data succesvol ingeladen
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Buurten: </span>
              <span className="font-semibold" style={{ color: '#166534', fontFamily: 'Raleway, sans-serif' }}>
                {existingData.metadata?.aantalBuurten || 0}
              </span>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Scenario's: </span>
              <span className="font-semibold" style={{ color: '#166534', fontFamily: 'Raleway, sans-serif' }}>
                {existingData.metadata?.aantalStrategieKolommen || 0}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}