export function generateGoogleMapsLink(addresses) {
  if (!addresses || addresses.length === 0) return null;

  const encodedStops = addresses.map(addr =>
    encodeURIComponent(addr)
  );

  return `https://www.google.com/maps/dir/${encodedStops.join('/')}`;
}
