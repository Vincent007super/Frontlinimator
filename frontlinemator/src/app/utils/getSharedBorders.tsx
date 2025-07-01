import * as turf from '@turf/turf';
import { Feature, Polygon, MultiPolygon } from 'geojson';

function segmentsAreClose(
  seg1: turf.Feature<turf.LineString>,
  seg2: turf.Feature<turf.LineString>,
  threshold = 0.0005
): boolean {
  const [lon1a, lat1a] = seg1.geometry.coordinates[0];
  const [lon1b, lat1b] = seg1.geometry.coordinates[1];
  const [lon2a, lat2a] = seg2.geometry.coordinates[0];
  const [lon2b, lat2b] = seg2.geometry.coordinates[1];

  const close = (a: number[], b: number[]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1]) < threshold;

  return (
    close([lon1a, lat1a], [lon2a, lat2a]) ||
    close([lon1a, lat1a], [lon2b, lat2b]) ||
    close([lon1b, lat1b], [lon2a, lat2a]) ||
    close([lon1b, lat1b], [lon2b, lat2b]) 
  );
}

function mergeSegments(segments: [number, number][][]): [number, number][][] {
  const used = new Set<number>();
  const chains: [number, number][][] = [];

  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;

    const chain: [number, number][] = [...segments[i]];
    used.add(i);

    let extended = true;
    while (extended) {
      extended = false;

      for (let j = 0; j < segments.length; j++) {
        if (used.has(j)) continue;

        const seg = segments[j];
        const first = chain[0];
        const last = chain[chain.length - 1];

        if (pointsEqual(seg[0], last)) {
          chain.push(seg[1]);
          used.add(j);
          extended = true;
        } else if (pointsEqual(seg[1], last)) {
          chain.push(seg[0]);
          used.add(j);
          extended = true;
        } else if (pointsEqual(seg[0], first)) {
          chain.unshift(seg[1]);
          used.add(j);
          extended = true;
        } else if (pointsEqual(seg[1], first)) {
          chain.unshift(seg[0]);
          used.add(j);
          extended = true;
        }
      }
    }

    chains.push(chain);
  }

  return chains;
}

function pointsEqual(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) < 0.0001 && Math.abs(a[1] - b[1]) < 0.0001;
}

export function getSharedBorders(
  feature1: Feature<Polygon | MultiPolygon>,
  feature2: Feature<Polygon | MultiPolygon>,
  threshold = 0.0005
): [number, number][][] {
  const flat1 = turf.flatten(feature1);
  const flat2 = turf.flatten(feature2);

  const segs1 = flat1.features.flatMap(f => turf.lineSegment(f).features);
  const segs2 = flat2.features.flatMap(f => turf.lineSegment(f).features);

  const matches: [number, number][][] = [];

  for (const seg1 of segs1) {
    for (const seg2 of segs2) {
      if (segmentsAreClose(seg1, seg2, threshold)) {
        const coords = seg1.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        matches.push(coords);
      }
    }
  }

  return mergeSegments(matches);
}
