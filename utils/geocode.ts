export async function forwardGeocode(query: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' 한국')}&limit=1&accept-language=ko`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ko`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    return (
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.village ||
      addr.city_district ||
      addr.county ||
      ''
    );
  } catch {
    return '';
  }
}
