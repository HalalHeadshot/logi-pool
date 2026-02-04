export function generateGoogleMapsLink(addresses) {
  if (!addresses || addresses.length === 0) return null;

  if (addresses.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addresses[0])}&travelmode=driving`;
  }

  const destination = addresses[addresses.length - 1];
  const waypoints = addresses.slice(0, -1)
    .map(a => encodeURIComponent(a))
    .join('|');

  return `https://www.google.com/maps/dir/?api=1` +
         `&destination=${encodeURIComponent(destination)}` +
         `&waypoints=optimize:true|${waypoints}` +
         `&travelmode=driving`;
}
