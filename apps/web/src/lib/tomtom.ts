export type LatLng = {
  lat: number;
  lng: number;
};

export type ReverseGeocodeResult = {
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
};

export type StructuredLocation = {
  addressLine: string;
  city: string;
  pincode: string;
};

const DEFAULT_INDIA_CENTER: LatLng = {
  lat: 20.5937,
  lng: 78.9629,
};

export function getDefaultIndiaCenter(): LatLng {
  return DEFAULT_INDIA_CENTER;
}

export function getDisplayMapTileConfig(): { attribution: string; subdomains: string[]; url: string } {
  return {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: ["a", "b", "c", "d"],
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  };
}

export function buildLocationQuery(location: StructuredLocation): string {
  const addressLine = location.addressLine.trim();
  const city = location.city.trim();
  const pincode = location.pincode.trim();
  const parts = [addressLine];

  if (city && !addressLine.toLowerCase().includes(city.toLowerCase())) {
    parts.push(city);
  }

  if (pincode && !addressLine.includes(pincode)) {
    parts.push(pincode);
  }

  return parts.filter(Boolean).join(", ");
}

export function extractStructuredLocation(input: {
  address: string;
  city?: string;
  pincode?: string;
  secondaryText?: string;
}): StructuredLocation {
  const address = input.address.trim();
  const secondaryText = input.secondaryText?.trim() ?? "";
  const city =
    input.city?.trim() ||
    secondaryText.split(",").map((part) => part.trim()).find(Boolean) ||
    "";
  const pincode =
    input.pincode?.trim() ||
    address.match(/\b\d{6}\b/)?.[0] ||
    secondaryText.match(/\b\d{6}\b/)?.[0] ||
    "";

  return {
    addressLine: address,
    city,
    pincode,
  };
}
