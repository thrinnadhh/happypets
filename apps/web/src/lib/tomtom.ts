export type LatLng = {
  lat: number;
  lng: number;
};

export type ReverseGeocodeResult = {
  address: string;
  latitude: number;
  longitude: number;
};

const DEFAULT_INDIA_CENTER: LatLng = {
  lat: 20.5937,
  lng: 78.9629,
};

function getEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = import.meta.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export function getTomTomPublicKey(): string {
  return getEnvValue("VITE_TOMTOM_API_KEY", "NEXT_PUBLIC_TOMTOM_API_KEY") ?? "";
}

export function hasTomTomPublicKey(): boolean {
  return Boolean(getTomTomPublicKey());
}

export function getDefaultIndiaCenter(): LatLng {
  return DEFAULT_INDIA_CENTER;
}

export function getTomTomRasterTileUrl(): string {
  const key = getTomTomPublicKey();

  if (!key) {
    throw new Error("TomTom map display is not configured. Add VITE_TOMTOM_API_KEY or NEXT_PUBLIC_TOMTOM_API_KEY.");
  }

  return `https://{s}.api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${key}&view=IN`;
}

export async function reverseGeocodeTomTom(position: LatLng): Promise<ReverseGeocodeResult> {
  const key = getTomTomPublicKey();
  if (!key) {
    throw new Error("TomTom map display is not configured. Add VITE_TOMTOM_API_KEY or NEXT_PUBLIC_TOMTOM_API_KEY.");
  }

  const url = new URL(
    `https://api.tomtom.com/search/2/reverseGeocode/${position.lat},${position.lng}.json`,
  );
  url.searchParams.set("key", key);
  url.searchParams.set("language", "en-GB");
  url.searchParams.set("view", "IN");
  url.searchParams.set("radius", "200");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Unable to identify the selected location.");
  }

  const payload = await response.json() as {
    addresses?: Array<{
      address?: {
        freeformAddress?: string;
      };
      position?: {
        lat?: number;
        lon?: number;
      };
    }>;
  };

  const match = payload.addresses?.[0];
  const address = match?.address?.freeformAddress?.trim() ?? "";
  const latitude = Number(match?.position?.lat ?? position.lat);
  const longitude = Number(match?.position?.lon ?? position.lng);

  if (!address) {
    throw new Error("We could not derive an address from that map pin.");
  }

  return {
    address,
    latitude,
    longitude,
  };
}
