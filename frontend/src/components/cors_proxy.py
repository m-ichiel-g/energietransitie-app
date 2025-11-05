#!/usr/bin/env python3
"""
Simple CORS Proxy Server for PBL ZIP downloads
Usage: python3 cors_proxy.py
Then update App.js to use: http://localhost:5001/download/{gemeente}
"""

from flask import Flask, send_file, jsonify
from flask_cors import CORS
import requests
import io

app = Flask(__name__)
CORS(app)  # Enable CORS voor alle routes

PBL_BASE_URL = "https://dataportaal.pbl.nl/data/Startanalyse_aardgasvrije_buurten/2025/Gemeentes"

@app.route('/download/<gemeente>')
def download_gemeente(gemeente):
    """Download ZIP van PBL en stuur door naar frontend"""
    try:
        # Normaliseer gemeente naam
        normalized = gemeente
        if gemeente == "s-Gravenhage":
            normalized = "s-Gravenhage"
        elif gemeente == "s-Hertogenbosch":
            normalized = "s-Hertogenbosch"
        
        url = f"{PBL_BASE_URL}/{normalized}.zip"
        print(f"📥 Downloading: {url}")
        
        # Download van PBL
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Check file size
        content_length = len(response.content)
        print(f"📦 Downloaded: {content_length / 1024:.1f} KB")
        
        if content_length < 1000:
            return jsonify({'error': 'File too small'}), 400
        
        # Stuur door naar frontend
        return send_file(
            io.BytesIO(response.content),
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'{normalized}.zip'
        )
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'PBL CORS Proxy'})

if __name__ == '__main__':
    print("🚀 Starting CORS Proxy Server...")
    print("📍 Available at: http://localhost:5001")
    print("📍 Test: http://localhost:5001/health")
    print("\n⚠️  Install dependencies first:")
    print("   pip install flask flask-cors requests")
    print("\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True)