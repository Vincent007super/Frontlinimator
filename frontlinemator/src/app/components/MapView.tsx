'use client';

import { MapContainer, TileLayer, GeoJSON, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { LatLngExpression } from 'leaflet';
import { getSharedBorders } from '../utils/getSharedBorders';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export default function MapView() {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [frontlines, setFrontlines] = useState<LatLngExpression[][]>([]);

  useEffect(() => {
    fetch('/data/world_highres.geo.json')
      .then((res) => res.json())
      .then((data) => setGeoData(data));
  }, []);

  // 🧠 Sort points into a visually continuous line
  function sortByDistance(points: [number, number][]): [number, number][] {
    if (points.length <= 1) return points;

    const sorted: [number, number][] = [points[0]];
    const remaining = points.slice(1);

    while (remaining.length) {
      const last = sorted[sorted.length - 1];
      let closestIdx = 0;
      let closestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const [lat, lng] = remaining[i];
        const dist = Math.hypot(lat - last[0], lng - last[1]);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
          console.log(`From ${last} to ${remaining[closestIdx]} = ${closestDist}`);
        }
      }

      sorted.push(remaining.splice(closestIdx, 1)[0]);
    }

    return sorted;
  }

  useEffect(() => {
    if (selectedCountries.length === 2 && geoData) {
      const [country1, country2] = selectedCountries;

      const feature1 = geoData.features.find(
        (f: any) => f.properties.ADMIN === country1
      );
      const feature2 = geoData.features.find(
        (f: any) => f.properties.ADMIN === country2
      );

      if (!feature1 || !feature2) return;

      const shared = getSharedBorders(feature1, feature2);

      if (shared.length > 0) {
        const cleaned = shared
          .filter(segment => segment.length > 1)
          .map(sortByDistance);

        setFrontlines(cleaned);
      } else {
        alert('No shared border found between selected countries!');
        setFrontlines([]);
      }
    }
  }, [selectedCountries, geoData]);

  const onEachCountry = (feature: any, layer: any) => {
    const name = feature.properties.ADMIN;

    layer.on({
      click: () => {
        setSelectedCountries((prev) => {
          if (prev.includes(name)) {
            return prev.filter((n) => n !== name);
          } else if (prev.length < 2) {
            return [...prev, name];
          } else {
            return prev;
          }
        });
      },
    });

    layer.bindTooltip(name);
  };

  const getStyle = (feature: any) => {
    const name = feature.properties.ADMIN;
    if (selectedCountries.includes(name)) {
      const color = selectedCountries.indexOf(name) === 0 ? 'blue' : 'red';
      return {
        fillColor: color,
        color,
        weight: 2,
        fillOpacity: 0.5,
      };
    }

    return {
      fillColor: 'gray',
      color: 'black',
      weight: 1,
      fillOpacity: 0.2,
    };
  };

  return (
    <>
      <button
        onClick={() => setFrontlines([])}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          padding: '8px 12px',
          background: 'white',
          border: '1px solid gray',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Clear Frontlines
      </button>

      <MapContainer
        center={[51.505, 10]}
        zoom={5}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && (
          <GeoJSON
            data={geoData}
            onEachFeature={onEachCountry}
            style={getStyle}
          />
        )}
        {frontlines.map((line, idx) => (
          <Polyline
            key={idx}
            positions={line}
            pathOptions={{ color: 'red', weight: 3 }}
          />
        ))},
        {/* {frontlines.map((line, lineIdx) =>
          line.map((point, i) => (
            <Marker
              key={`marker-${lineIdx}-${i}`}
              position={point}
              title={`Line ${lineIdx}, Point ${i}`}
            />
          ))
        )} */}
      </MapContainer>
    </>
  );
}
