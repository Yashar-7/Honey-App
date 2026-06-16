const UNAVAILABLE_LABEL = "Ubicación exacta no disponible";

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

/** Resuelve la API key: Maps_API_KEY (Honey App) → GOOGLE_MAPS_API_KEY → MAPS_API_KEY */
export function resolveMapsApiKey(): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  return (
    env.Maps_API_KEY?.trim() ||
    env.MAPS_API_KEY?.trim() ||
    env.GOOGLE_MAPS_API_KEY?.trim() ||
    undefined
  );
}

function pickComponent(
  components: GeocodeAddressComponent[],
  ...types: string[]
): string {
  const match = components.find((c) =>
    types.some((type) => c.types.includes(type)),
  );
  return match?.long_name?.trim() ?? "";
}

function hasStreetAddress(result: GeocodeResult): boolean {
  const components = result.address_components ?? [];
  const route = pickComponent(components, "route");
  const streetNumber = pickComponent(components, "street_number");
  return Boolean(route || streetNumber);
}

/** Coordenadas legibles para humanos (ej. -38.00550, -57.54260). */
export function formatReadableCoordinates(
  latitude: number,
  longitude: number,
): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

/** Etiqueta cuando Google no devuelve calle exacta o la API falla. */
export function formatUnavailableLocation(
  latitude: number,
  longitude: number,
): string {
  return `${UNAVAILABLE_LABEL} · ${formatReadableCoordinates(latitude, longitude)}`;
}

/** Formato humano: "Calle Altura, Localidad" (ej. Av. Colón 1200, Mar del Plata). */
export function formatGeocodeResult(result: GeocodeResult): string | null {
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

  if (hasStreetAddress(result) && result.formatted_address?.trim()) {
    return result.formatted_address.split(",").slice(0, 2).join(",").trim();
  }

  return null;
}

export function formatLocationReference(addressLabel: string): string {
  const clean = addressLabel.trim();
  if (!clean) return "📍 Ubicación compartida";
  if (clean.startsWith("📍")) return clean;
  return `📍 ${clean}`;
}

function pickBestGeocodeResult(results: GeocodeResult[]): string | null {
  for (const result of results) {
    const formatted = formatGeocodeResult(result);
    if (formatted) return formatted;
  }

  const first = results[0]?.formatted_address?.trim();
  if (first) {
    return first.split(",").slice(0, 2).join(",").trim();
  }

  return null;
}

/**
 * Convierte coordenadas GPS en dirección legible vía Google Maps Geocoding API.
 */
export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const apiKey = resolveMapsApiKey();

  if (!apiKey) {
    console.warn("[geocoding] Maps_API_KEY no configurada en .env");
    return {
      addressLabel: formatUnavailableLocation(latitude, longitude),
      fromGeocoder: false,
    };
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${latitude},${longitude}`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "es");
    url.searchParams.set("region", "ar");
    url.searchParams.set(
      "result_type",
      "street_address|route|intersection|premise|subpremise",
    );

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as GeocodeApiResponse;

    if (data.status !== "OK" || !data.results?.length) {
      throw new Error(data.error_message || `status=${data.status}`);
    }

    const streetAddress = pickBestGeocodeResult(data.results);
    if (streetAddress) {
      return { addressLabel: streetAddress, fromGeocoder: true };
    }

    return {
      addressLabel: formatUnavailableLocation(latitude, longitude),
      fromGeocoder: false,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(
      `[geocoding] Falló reverse geocoding (${latitude}, ${longitude}): ${detail}`,
    );
    return {
      addressLabel: formatUnavailableLocation(latitude, longitude),
      fromGeocoder: false,
    };
  }
}
