'use client'; // Needed if you're using Next.js 13+ with App Router

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

export default function MapView() {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    // Example: load countries from public folder
    fetch('/data/world_highres.geo.json')
  .then((res) => res.json())
  .then((data) => setGeoData(data));
  }, []);

  return (
    <MapContainer
      center={[51.505, 10]}
      zoom={4}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoData && (
        <GeoJSON
        data={geoData}
        style={() => ({
          color: '#333',
          weight: 1,
          fillOpacity: 0.2,
        })}
      />
      
      )}
    </MapContainer>
  );
}
