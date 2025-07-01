'use client';

import { MapContainer, GeoJSON, Polyline, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import { getSharedBorders } from '../utils/getSharedBorders';
import { animateFrontlineStep } from '../utils/animateFrontline';
import L from 'leaflet';

// Setup Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export default function MapView() {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [frontline, setFrontline] = useState<[number, number][]>([]);
  const [poi, setPoi] = useState<{ lat: number; lng: number } | null>(null);
  const animationRef = useRef<number | null>(null);
  const featureIndicesRef = useRef<number[]>([]);

  useEffect(() => {
    fetch('/data/world_highres.geo.json')
      .then((res) => res.json())
      .then(setGeoData);
  }, []);

  // Generate frontline when 2 countries selected
  useEffect(() => {
    if (selectedCountries.length === 2 && geoData) {
      const [c1, c2] = selectedCountries;
      const i1 = geoData.features.findIndex((f: any) => f.properties.ADMIN === c1);
      const i2 = geoData.features.findIndex((f: any) => f.properties.ADMIN === c2);

      if (i1 === -1 || i2 === -1) return;

      const f1 = geoData.features[i1];
      const f2 = geoData.features[i2];
      const shared = getSharedBorders(f1, f2);

      if (!shared.length) return;

      const longest = shared.reduce((a, b) => (a.length > b.length ? a : b));
      setFrontline(longest);
      featureIndicesRef.current = [i1, i2];
    }
  }, [selectedCountries, geoData]);

  // Animation step
  const startAnimation = () => {
    if (!poi || !geoData || frontline.length === 0) return;

    const step = () => {
      const now = Date.now();
      const updated = animateFrontlineStep(frontline, poi, 0.01, 0.002, now);
      setFrontline(updated);

      // Mutate border segments in both features
      const updatedGeo = structuredClone(geoData);

      for (const idx of featureIndicesRef.current) {
        const feature = updatedGeo.features[idx];

        feature.geometry.coordinates.forEach((poly: any[], polyIdx: number) => {
          poly.forEach((ring: any[], ringIdx: number) => {
            ring.forEach((coord: number[], ptIdx: number) => {
              const [lng, lat] = coord;
              const match = updated.find(
                ([fLat, fLng]) =>
                  Math.abs(fLat - lat) < 0.0001 &&
                  Math.abs(fLng - lng) < 0.0001
              );

              if (match) {
                ring[ptIdx] = [match[1], match[0]]; // [lng, lat]
              }
            });
          });
        });
      }

      setGeoData(updatedGeo);
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
  };

  const stopAnimation = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  };

  const onEachCountry = (feature: any, layer: any) => {
    const name = feature.properties.ADMIN;
    layer.on({
      click: () => {
        setSelectedCountries((prev) => {
          if (prev.includes(name)) return prev.filter((n) => n !== name);
          if (prev.length < 2) return [...prev, name];
          return prev;
        });
      },
    });
    layer.bindTooltip(name);
  };

  const getStyle = (feature: any) => {
    const name = feature.properties.ADMIN;
    if (selectedCountries.includes(name)) {
      return {
        fillColor: selectedCountries.indexOf(name) === 0 ? 'blue' : 'red',
        color: 'black',
        weight: 2,
        fillOpacity: 0.4,
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
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        padding: '8px',
        background: 'white',
        border: '1px solid gray',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '1vw',
      }}>
        <button onClick={() => { setPoi(null); setFrontline([]); stopAnimation(); }}>🧹 Clear</button>
        <button onClick={() => setPoi({ lat: 51.5, lng: 10 })}>🎯 Place POI</button>
        <button onClick={startAnimation}>▶️ Animate</button>
        <button onClick={stopAnimation}>⏹ Stop</button>
      </div>

      <MapContainer center={[51.505, 10]} zoom={5} style={{ height: '100vh', width: '100%' }}>
        {geoData && (
          <GeoJSON data={geoData} onEachFeature={onEachCountry} style={getStyle} />
        )}
        {frontline.length > 1 && (
          <Polyline
            positions={frontline}
            pathOptions={{ color: 'purple', weight: 6 }}
          />
        )}
        {poi && (
          <Marker
            position={poi}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                setPoi({ lat, lng });
              },
            }}
          />
        )}
      </MapContainer>
    </>
  );
}
