export function animateFrontlineStep(
  points: { lat: number; lng: number }[],
  poi: { lat: number; lng: number },
  progress: number = 0.01,
  waveStrength: number = 0.002,
  time: number = Date.now()
): { lat: number; lng: number }[] {
  return points.map((point, i) => {
    const directionLat = poi.lat - point.lat;
    const directionLng = poi.lng - point.lng;

    // Move slightly toward the POI
    let newLat = point.lat + directionLat * progress;
    let newLng = point.lng + directionLng * progress;

    // Add sine wave distortion
    const wave = Math.sin(i * 0.5 + time / 300) * waveStrength;
    newLat += wave;

    return { lat: newLat, lng: newLng };
  });
}
