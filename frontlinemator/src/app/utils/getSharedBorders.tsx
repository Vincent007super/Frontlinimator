import * as turf from '@turf/turf';
import {
  Feature,
  GeoJsonProperties,
  Polygon,
  MultiPolygon
} from 'geojson';

// Compare two segments and return true if their points are very close
function segmentsAreClose(seg1: turf.Feature<turf.LineString>, seg2: turf.Feature<turf.LineString>, threshold = 0.001): boolean {
  const coords1 = seg1.geometry.coordinates;
  const coords2 = seg2.geometry.coordinates;

  for (let i = 0; i < coords1.length; i++) {
    const [lon1, lat1] = coords1[i];
    for (let j = 0; j < coords2.length; j++) {
      const [lon2, lat2] = coords2[j];
      const dist = Math.hypot(lat1 - lat2, lon1 - lon2);
      if (dist < threshold) {
        return true;
      }
    }
  }
  return false;
}

export function getSharedBorders(
  feature1: Feature,
  feature2: Feature,
  threshold = 0.001
): Array<[number, number][]> {
  const borders: Array<[number, number][]> = [];

  const flat1 = turf.flatten(feature1);
  const flat2 = turf.flatten(feature2);

  const segments1 = flat1.features.flatMap(f =>
    turf.lineSegment(f).features
  );

  const segments2 = flat2.features.flatMap(f =>
    turf.lineSegment(f).features
  );

  console.log(`🟦 Comparing segments: ${segments1.length} from A vs ${segments2.length} from B`);

  for (const seg1 of segments1) {
    for (const seg2 of segments2) {
      if (segmentsAreClose(seg1, seg2, threshold)) {
        const coords = seg1.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        borders.push(coords);
      }
    }
  }

  console.log(`✅ Found ${borders.length} shared segments.`);

  return borders;
}