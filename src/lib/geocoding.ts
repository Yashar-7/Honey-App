/** Dirección legible por defecto si falla Google Geocoding o no hay API key. */
export const GEOCODING_FALLBACK_ADDRESS = "Zona: Mar del Plata Centro";

type GeocodeAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GeocodeResult = {
  formatted_address?: string;
  address_components?: GeocodeAddressComponent[];
};

type GeocodeApiResponse = {
  status: string;
  results?: GeocodeResult[];
  error_message?: string;
};

export type ReverseGeocodeResult = {
  addressLabel: string;
  fromGeocoder: boolean;
};

function pickComponent(
  components: GeocodeAddressComponent[],
  ...types: string[]
): string {
  const match = components.find((c) =>
    types.some((type) => c.types.includes(type)),
  );
  return match?.long_name?.trim() ?? "";
}

/** Formato humano: "Calle + Altura, Localidad" (ej. Av. Colón 1200, Mar del Plata). */
export function formatGeocodeResult(result: GeocodeResult): string {
  const components = result.address_components ?? [];
  const route = pickComponent(components, "route");
  const streetNumber = pickComponent(components, "street_number");
  const locality = pickComponent(
    components,
    "locality",
    "sublocality",
    "administrative_area_level_2",
  );

  const streetLine = [route, streetNumber].filter(Boolean).join(" ").trim();
  if (streetLine && locality) return `${streetLine}, ${locality}`;
  if (streetLine) return streetLine;

  if (result.formatted_address?.trim()) {
    return result.formatted_address.split(",").slice(0, 2).join(",").trim();
  }

  return GEOCODING_FALLBACK_ADDRESS;
}

/**
 * Convierte coordenadas GPS en dirección legible vía Google Maps Geocoding API.
 * Requiere GOOGLE_MAPS_API_KEY en el servidor.
 */
export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    console.warn(
      "[geocoding] GOOGLE_MAPS_API_KEY no configurada — usando fallback",
    );
    return { addressLabel: GEOCODING_FALLBACK_ADDRESS, fromGeocoder: false };
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${latitude},${longitude}`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "es");
    url.searchParams.set("region", "ar");

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as GeocodeApiResponse;

    if (data.status !== "OK" || !data.results?.length) {
      throw new Error(data.error_message || `status=${data.status}`);
    }

    const addressLabel = formatGeocodeResult(data.results[0]);
    return { addressLabel, fromGeocoder: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(
      `[geocoding] Falló reverse geocoding (${latitude}, ${longitude}): ${detail}`,
    );
    return { addressLabel: GEOCODING_FALLBACK_ADDRESS, fromGeocoder: false };
  }
}
