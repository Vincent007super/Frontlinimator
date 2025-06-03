'use client';

import { MapContainer, TileLayer, GeoJSON, Polyline, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import { LatLngExpression } from 'leaflet';
import { getSharedBorders } from '../utils/getSharedBorders';
import { animateFrontlineStep } from '../utils/animateFrontline';
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
  const [poi, setPoi] = useState<{ lat: number; lng: number } | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('/data/world_highres.geo.json')
      .then((res) => res.json())
      .then((data) => setGeoData(data));
  }, []);

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
        }
      }

      sorted.push(remaining.splice(closestIdx, 1)[0]);
    }

    return sorted;
  }

  useEffect(() => {
    if (selectedCountries.length === 2 && geoData) {
      const [country1, country2] = selectedCountries;
      const feature1 = geoData.features.find((f: any) => f.properties.ADMIN === country1);
      const feature2 = geoData.features.find((f: any) => f.properties.ADMIN === country2);

      if (!feature1 || !feature2) return;

      const shared = getSharedBorders(feature1, feature2);
      const cleaned = shared
        .filter(segment => segment.length > 1)
        .map(sortByDistance);

      setFrontlines(cleaned);
    }
  }, [selectedCountries, geoData]);

  const startAnimation = () => {
    if (!poi || frontlines.length === 0) return;

    const lineToAnimate = [...frontlines];
    const targetIdx = findLongestIndex(lineToAnimate);

    const step = () => {
      const now = Date.now();
      const baseLine = lineToAnimate[targetIdx];

      if (!baseLine) return;

      const objectified = baseLine.map(([lat, lng]) => ({ lat, lng }));
      const animated = animateFrontlineStep(objectified, poi, 0.01, 0.002, now);

      // convert back to [lat, lng]
      lineToAnimate[targetIdx] = animated.map(p => [p.lat, p.lng]);

      setFrontlines([...lineToAnimate]);
      animationRef.current = requestAnimationFrame(step);
    };

    console.log("Frontline segments:");
    frontlines.forEach((line, idx) => {
      console.log(`Line ${idx}: ${line.length} points`);
    });
    animationRef.current = requestAnimationFrame(step);
  };

  const findLongestIndex = (lines: LatLngExpression[][]): number => {
    let max = 0;
    let idx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > max) {
        max = lines[i].length;
        idx = i;
      }
    }
    return idx;
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
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          padding: '8px',
          background: 'white',
          color: 'black',
          fontWeight: 'bold',
          fontSize: '1vw',
          border: '1px solid gray',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <button onClick={() => { setFrontlines([]); setPoi(null); stopAnimation(); }}>Clear</button>
        <button onClick={() => setPoi({ lat: 51.5, lng: 10 })}>Place POI</button>
        <button onClick={startAnimation}>Render</button>
        <button onClick={stopAnimation}>Stop</button>
      </div>

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
            pathOptions={{ color: 'purple', weight: 6 }}
          />
        ))}

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
