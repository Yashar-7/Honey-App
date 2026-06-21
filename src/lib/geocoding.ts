const UNAVAILABLE_LABEL = "Ubicación exacta no disponible";

const GEOCODING_DEBUG =
  process.env.GEOCODING_DEBUG === "true" ||
  process.env.NODE_ENV !== "production";

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

export type GeocodeDebugInfo = {
  /** Origen de la key en .env (Maps_API_KEY, etc.) */
  keySource?: string;
  /** Primeros/últimos caracteres de la key (nunca la key completa) */
  keyPreview?: string;
  keyConfigured?: boolean;
  httpStatus?: number;
  httpStatusText?: string;
  googleStatus?: string;
  googleErrorMessage?: string;
  resultsCount?: number;
  networkError?: string;
  /** CORS solo aplica en fetch desde el navegador; la geocodificación corre en el servidor */
  corsHint?: string;
  rawHttpBodyPreview?: string;
};

export type ReverseGeocodeResult = {
  addressLabel: string;
  fromGeocoder: boolean;
  /** Presente si GEOCODING_DEBUG=true o NODE_ENV !== production */
  debug?: GeocodeDebugInfo;
};

const KEY_ENV_NAMES = [
  "Maps_API_KEY",
  "MAPS_API_KEY",
  "GOOGLE_MAPS_API_KEY",
] as const;

let apiKeyDiagnosticLogged = false;

/** Máscara segura para logs: primeros 6 + … + últimos 4 caracteres */
export function maskApiKeyForLog(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 12) return "*** (key demasiado corta)";
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

export function resolveMapsApiKeySource():
  | { key: string; source: (typeof KEY_ENV_NAMES)[number] }
  | null {
  const env = process.env as Record<string, string | undefined>;
  for (const name of KEY_ENV_NAMES) {
    const value = env[name]?.trim();
    if (value) return { key: value, source: name };
  }
  return null;
}

/** Resuelve la API key: Maps_API_KEY → MAPS_API_KEY → GOOGLE_MAPS_API_KEY */
export function resolveMapsApiKey(): string | undefined {
  return resolveMapsApiKeySource()?.key;
}

function logApiKeyDiagnosticOnce(resolved: ReturnType<typeof resolveMapsApiKeySource>) {
  if (apiKeyDiagnosticLogged) return;
  apiKeyDiagnosticLogged = true;

  if (!resolved) {
    console.log(
      "[geocoding] Maps_API_KEY no detectada. Revisá .env:",
      KEY_ENV_NAMES.join(", "),
    );
    return;
  }

  console.log(
    `[geocoding] API key cargada desde ${resolved.source} → preview: ${maskApiKeyForLog(resolved.key)}`,
  );
}

function attachDebug(
  base: ReverseGeocodeResult,
  debug: GeocodeDebugInfo,
): ReverseGeocodeResult {
  if (!GEOCODING_DEBUG) return base;
  return { ...base, debug };
}

function logGoogleGeocodeFailure(
  latitude: number,
  longitude: number,
  debug: GeocodeDebugInfo,
  googleResponse?: GeocodeApiResponse | null,
) {
  console.log("[geocoding] ── respuesta Google Geocoding API ──");
  console.log("[geocoding] coordenadas:", latitude, longitude);
  if (debug.keySource) {
    console.log("[geocoding] key env:", debug.keySource, "→", debug.keyPreview);
  }
  if (debug.httpStatus != null) {
    console.log(
      "[geocoding] HTTP:",
      debug.httpStatus,
      debug.httpStatusText ?? "",
    );
  }
  if (debug.googleStatus) {
    console.log("[geocoding] Google status:", debug.googleStatus);
  }
  if (debug.googleErrorMessage) {
    console.log("[geocoding] Google error_message:", debug.googleErrorMessage);
  }
  if (debug.resultsCount != null) {
    console.log("[geocoding] results.length:", debug.resultsCount);
  }
  if (googleResponse) {
    console.log(
      "[geocoding] Google response (completo):",
      JSON.stringify(
        {
          status: googleResponse.status,
          error_message: googleResponse.error_message ?? null,
          results: googleResponse.results ?? [],
        },
        null,
        2,
      ),
    );
  }
  if (debug.networkError) {
    console.log("[geocoding] error de red/fetch:", debug.networkError);
  }
  if (debug.corsHint) {
    console.log("[geocoding] CORS:", debug.corsHint);
  }
  if (debug.rawHttpBodyPreview) {
    console.log("[geocoding] cuerpo HTTP (preview):", debug.rawHttpBodyPreview);
  }
  console.log("[geocoding] ───────────────────────────────────");
}

function describeFetchError(error: unknown): GeocodeDebugInfo {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "Error";
  const debug: GeocodeDebugInfo = {
    networkError: `${name}: ${message}`,
  };

  const lower = message.toLowerCase();
  if (
    lower.includes("cors") ||
    lower.includes("cross-origin") ||
    lower.includes("access-control")
  ) {
    debug.corsHint =
      "El navegador bloqueó la petición por CORS. La geocodificación de Honey App corre en el servidor (Node); si ves esto en el backend, revisá proxy/firewall. Si lo ves en el navegador, no deberías llamar a Google Maps directamente desde el cliente.";
  } else if (name === "AbortError" || lower.includes("timeout")) {
    debug.corsHint =
      "Timeout al contactar maps.googleapis.com (10s). Revisá conectividad del servidor.";
  } else if (lower.includes("fetch failed") || lower.includes("enotfound")) {
    debug.corsHint =
      "Fallo de red al resolver maps.googleapis.com desde el servidor (DNS/firewall), no es CORS del navegador.";
  }

  return debug;
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
 * Logs detallados en consola del servidor; con GEOCODING_DEBUG también devuelve `debug` al cliente.
 */
export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const resolved = resolveMapsApiKeySource();
  logApiKeyDiagnosticOnce(resolved);

  const baseDebug: GeocodeDebugInfo = {
    keyConfigured: Boolean(resolved),
    keySource: resolved?.source,
    keyPreview: resolved ? maskApiKeyForLog(resolved.key) : undefined,
  };

  if (!resolved) {
    const debug = { ...baseDebug };
    logGoogleGeocodeFailure(latitude, longitude, debug);
    return attachDebug(
      {
        addressLabel: formatUnavailableLocation(latitude, longitude),
        fromGeocoder: false,
      },
      debug,
    );
  }

  const { key: apiKey } = resolved;

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

    const rawText = await response.text();
    let data: GeocodeApiResponse;

    try {
      data = JSON.parse(rawText) as GeocodeApiResponse;
    } catch {
      const debug: GeocodeDebugInfo = {
        ...baseDebug,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        googleStatus: "INVALID_JSON",
        googleErrorMessage: "La respuesta no es JSON válido",
        rawHttpBodyPreview: rawText.slice(0, 280),
      };
      logGoogleGeocodeFailure(latitude, longitude, debug);
      return attachDebug(
        {
          addressLabel: formatUnavailableLocation(latitude, longitude),
          fromGeocoder: false,
        },
        debug,
      );
    }

    const debug: GeocodeDebugInfo = {
      ...baseDebug,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      googleStatus: data.status,
      googleErrorMessage: data.error_message,
      resultsCount: data.results?.length ?? 0,
    };

    if (!response.ok) {
      debug.googleErrorMessage =
        data.error_message ||
        debug.googleErrorMessage ||
        `HTTP ${response.status} ${response.statusText}`;
      logGoogleGeocodeFailure(latitude, longitude, debug, data);
      return attachDebug(
        {
          addressLabel: formatUnavailableLocation(latitude, longitude),
          fromGeocoder: false,
        },
        debug,
      );
    }

    if (data.status !== "OK") {
      logGoogleGeocodeFailure(latitude, longitude, debug, data);
      return attachDebug(
        {
          addressLabel: formatUnavailableLocation(latitude, longitude),
          fromGeocoder: false,
        },
        debug,
      );
    }

    if (!data.results?.length) {
      debug.googleStatus = data.status || "ZERO_RESULTS";
      logGoogleGeocodeFailure(latitude, longitude, debug, data);
      return attachDebug(
        {
          addressLabel: formatUnavailableLocation(latitude, longitude),
          fromGeocoder: false,
        },
        debug,
      );
    }

    const streetAddress = pickBestGeocodeResult(data.results);
    if (streetAddress) {
      if (GEOCODING_DEBUG) {
        console.log(
          `[geocoding] OK · ${streetAddress} (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
        );
      }
      return attachDebug(
        { addressLabel: streetAddress, fromGeocoder: true },
        { ...debug, googleStatus: "OK" },
      );
    }

    debug.googleStatus = "OK_NO_STREET";
    logGoogleGeocodeFailure(latitude, longitude, debug, data);
    return attachDebug(
      {
        addressLabel: formatUnavailableLocation(latitude, longitude),
        fromGeocoder: false,
      },
      debug,
    );
  } catch (error) {
    const fetchDebug = describeFetchError(error);
    const debug: GeocodeDebugInfo = { ...baseDebug, ...fetchDebug };
    logGoogleGeocodeFailure(latitude, longitude, debug);
    return attachDebug(
      {
        addressLabel: formatUnavailableLocation(latitude, longitude),
        fromGeocoder: false,
      },
      debug,
    );
  }
}
