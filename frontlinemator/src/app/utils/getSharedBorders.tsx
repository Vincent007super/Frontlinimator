import * as turf from '@turf/turf';
import {
    Feature,
    GeoJsonProperties,
    Polygon,
    MultiPolygon,
    Position
} from 'geojson';

export function getSharedBorders(
    feature1: Feature,
    feature2: Feature
): Array<[number, number][]> {
    const borders: Array<[number, number][]> = [];

    const geom1 = turf.flatten(feature1);
    const geom2 = turf.flatten(feature2);

    turf.geomEach(geom1, (geomPart1) => {
        turf.geomEach(geom2, geomPart2 => {
            if (
                geomPart1.type !== 'Polygon' && geomPart1.type !== 'MultiPolygon' ||
                geomPart2.type !== 'Polygon' && geomPart2.type !== 'MultiPolygon'
            ) {
                return;
            }

            const line1 = turf.polygonToLine(geomPart1 as Feature<Polygon | MultiPolygon, GeoJsonProperties>);
            const line2 = turf.polygonToLine(geomPart2 as Feature<Polygon | MultiPolygon, GeoJsonProperties>);

            const inter = turf.lineIntersect(line1, line2);

            if (inter.features.length > 1) {
                const coords: [number, number][] = inter.features
                    .map((f) => f.geometry.coordinates)
                    .filter((pos): pos is [number, number] =>
                        Array.isArray(pos) &&
                        pos.length === 2 &&
                        typeof pos[0] === 'number' &&
                        typeof pos[1] === 'number'
                    )
                    .map(([lon, lat]) => [lat, lon]); // Correct the order for Leaflet

                borders.push(coords);
            }
        });
    });

    return borders;
}
