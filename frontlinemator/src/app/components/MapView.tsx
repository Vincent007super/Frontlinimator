'use client';

import { MapContainer, TileLayer, GeoJSON, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import type { LatLngExpression } from 'leaflet';

function arePointsClose(p1: number[], p2: number[], threshold = 0.01) {
  return (
    Math.abs(p1[0] - p2[0]) < threshold &&
    Math.abs(p1[1] - p2[1]) < threshold
  );
}

function extractBorderCoords(feature: any): number[][] {
  const geom = feature.geometry;
  if (geom.type === 'Polygon') {
    return geom.coordinates.flat();
  } else if (geom.type === 'MultiPolygon') {
    return geom.coordinates.flat(2);
  }
  return [];
}

function findSharedBorderCoords(coords1: number[][], coords2: number[][]): LatLngExpression[] {
  const shared: LatLngExpression[] = [];

  for (const point1 of coords1) {
    for (const point2 of coords2) {
      if (arePointsClose(point1, point2)) {
        shared.push([point1[1], point1[0]]); // [lat, lng] for Leaflet
        break;
      }
    }
  }

  return shared;
}

export default function MapView() {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [frontlineCoords, setFrontlineCoords] = useState<LatLngExpression[]>([]);

  useEffect(() => {
    fetch('/data/world_highres.geo.json')
      .then((res) => res.json())
      .then((data) => setGeoData(data));
  }, []);

  // Detect real border between countries
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

      const coords1 = extractBorderCoords(feature1);
      const coords2 = extractBorderCoords(feature2);
      const sharedBorder = findSharedBorderCoords(coords1, coords2);

      if (sharedBorder.length === 0) {
        console.warn(`${country1} and ${country2} do not border each other.`);
        setFrontlineCoords([]);
      } else {
        setFrontlineCoords(sharedBorder);
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
      }
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
        <>
          <GeoJSON
            data={geoData}
            onEachFeature={onEachCountry}
            style={getStyle}
          />
          {frontlineCoords.length > 0 && (
            <Polyline positions={frontlineCoords} pathOptions={{ color: 'darkRed', weight: 3 }} />
          )}
        </>
      )}
    </MapContainer>
  );
}
