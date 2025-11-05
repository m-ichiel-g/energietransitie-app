/**
 * Vercel Serverless Function - PBL ZIP Download Proxy
 * 
 * Deployment URL: https://jouw-app.vercel.app/api/download?gemeente=Amsterdam
 * Local dev: http://localhost:3000/api/download?gemeente=Amsterdam
 */

export default async function handler(req, res) {
  // CORS headers - sta alle origins toe
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Alleen GET requests toegestaan
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gemeente } = req.query;

    if (!gemeente) {
      return res.status(400).json({ error: 'Missing gemeente parameter' });
    }

    // Normaliseer gemeente naam (zelfde logica als Python script)
    let normalized = gemeente;
    if (gemeente === "'s-Gravenhage" || gemeente === "s-Gravenhage") {
      normalized = "s-Gravenhage";
    } else if (gemeente === "'s-Hertogenbosch" || gemeente === "s-Hertogenbosch") {
      normalized = "s-Hertogenbosch";
    }

    const pblUrl = `https://dataportaal.pbl.nl/data/Startanalyse_aardgasvrije_buurten/2025/Gemeentes/${normalized}.zip`;
    
    console.log(`📥 Downloading: ${pblUrl}`);

    // Download van PBL server
    const response = await fetch(pblUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PBL-Proxy/1.0)'
      }
    });

    if (!response.ok) {
      console.error(`❌ PBL server error: ${response.status}`);
      return res.status(response.status).json({ 
        error: `Failed to download from PBL: ${response.statusText}`,
        gemeente: normalized
      });
    }

    // Lees de ZIP data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`✅ Downloaded: ${(buffer.length / 1024).toFixed(1)} KB`);

    // Check file size (minimaal 1KB)
    if (buffer.length < 1000) {
      return res.status(400).json({ 
        error: 'Downloaded file too small',
        size: buffer.length 
      });
    }

    // Stuur ZIP terug naar frontend
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${normalized}.zip"`);
    res.setHeader('Content-Length', buffer.length);
    
    return res.status(200).send(buffer);

  } catch (error) {
    console.error('❌ Error in serverless function:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}