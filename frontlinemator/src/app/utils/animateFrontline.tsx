export function animateFrontlineStep(
  points: [number, number][],
  poi: { lat: number; lng: number },
  progress: number = 0.01,
  waveStrength: number = 0.002,
  time: number = Date.now()
): [number, number][] {
  return points.map(([lat, lng], i) => {
    const dirLat = poi.lat - lat;
    const dirLng = poi.lng - lng;

    // Move toward POI
    let newLat = lat + dirLat * progress;
    let newLng = lng + dirLng * progress;

    // Add wavy distortion
    const wave = Math.sin(i * 0.5 + time / 300) * waveStrength;
    newLat += wave;

    return [newLat, newLng];
  });
}