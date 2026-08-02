"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMAIL_KEY,
  NAME_KEY,
  STORAGE_KEY,
} from "@/lib/utils";

type HubSection = "map" | "network" | "shops";

type Announcement = {
  id: string;
  title: string;
  body: string;
  tag: string;
  isPublished: boolean;
  publishedAt: string;
};

type PetShop = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
};

type CommunityAlert = {
  id: string;
  species: string;
  zone: string;
  photoUrl: string;
  notes: string | null;
  createdAt: string;
};

type LostAlert = {
  id: string;
  name: string;
  photoUrl?: string | null;
  species?: string | null;
  isLost?: boolean;
};

const TAGS = ["Zoonosis", "Comunidad", "Prevención", "Cuidado", "Urgente"] as const;
const TOAST_MS = 4200;
const MDP_CENTER: [number, number] = [-38.0055, -57.5426];
const ADMIN_FLAG_KEY = "honey_owner_is_admin";

declare global {
  interface Window {
    // Leaflet se carga por CDN en el hub admin
    L?: {
      map: (
        el: HTMLElement,
        opts?: { zoomControl?: boolean },
      ) => AdminLeafletMap;
      tileLayer: (
        url: string,
        opts?: Record<string, unknown>,
      ) => { addTo: (map: AdminLeafletMap) => unknown };
      layerGroup: () => AdminLeafletLayerGroup;
      circleMarker: (
        latlng: [number, number],
        opts?: Record<string, unknown>,
      ) => AdminLeafletMarker;
    };
  }
}

type AdminLeafletMap = {
  setView: (c: [number, number], z: number) => AdminLeafletMap;
  invalidateSize: () => void;
  remove: () => void;
};

type AdminLeafletLayerGroup = {
  addTo: (map: AdminLeafletMap) => AdminLeafletLayerGroup;
  addLayer: (layer: unknown) => AdminLeafletLayerGroup;
};

type AdminLeafletMarker = {
  bindPopup: (html: string) => AdminLeafletMarker;
};

function loadLeaflet(): Promise<NonNullable<Window["L"]>> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    const cssId = "leaflet-css-admin-hub";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-leaflet-admin="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet no cargó"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.dataset.leafletAdmin = "1";
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet no disponible"));
    };
    script.onerror = () => reject(new Error("No se pudo cargar Leaflet"));
    document.body.appendChild(script);
  });
}

function authHeaders(): HeadersInit {
  try {
    const token = sessionStorage.getItem(STORAGE_KEY) || "";
    return token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" };
  } catch {
    return { "Content-Type": "application/json" };
  }
}

function safeNavigate(href: string) {
  try {
    window.location.assign(href);
  } catch {
    window.location.href = href;
  }
}

function typeLabel(type: string) {
  return type === "veterinary" ? "Veterinaria" : "Pet Shop";
}

/**
 * Master Admin Hub — mapa, zoonosis y comercios en una sola pantalla.
 */
export default function AdminMasterHubPage() {
  const [section, setSection] = useState<HubSection>("map");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("Administrador");

  const [items, setItems] = useState<Announcement[]>([]);
  const [shops, setShops] = useState<PetShop[]>([]);
  const [communityAlerts, setCommunityAlerts] = useState<CommunityAlert[]>([]);
  const [lostAlerts, setLostAlerts] = useState<LostAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<string>("Zoonosis");

  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState<"veterinary" | "petshop">("veterinary");
  const [shopAddress, setShopAddress] = useState("");
  const [shopLat, setShopLat] = useState("");
  const [shopLng, setShopLng] = useState("");

  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AdminLeafletMap | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    try {
      const token = sessionStorage.getItem(STORAGE_KEY);
      if (!token) {
        safeNavigate("/admin-login/");
        return;
      }
      setAdminEmail(sessionStorage.getItem(EMAIL_KEY) || "");
      setAdminName(sessionStorage.getItem(NAME_KEY) || "Administrador");
      sessionStorage.setItem(ADMIN_FLAG_KEY, "1");
    } catch {
      safeNavigate("/admin-login/");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [annRes, shopRes, communityRes, lostRes] = await Promise.all([
        fetch("/api/announcements/admin", { headers: authHeaders() }),
        fetch("/api/pet-shops/admin", { headers: authHeaders() }),
        fetch("/api/community-alerts"),
        fetch("/api/alerts/active"),
      ]);

      if (
        annRes.status === 401 ||
        annRes.status === 403 ||
        shopRes.status === 401 ||
        shopRes.status === 403
      ) {
        safeNavigate("/admin-login/");
        return;
      }

      const annData = (await annRes.json().catch(() => ({}))) as {
        announcements?: Announcement[];
        error?: string;
      };
      const shopData = (await shopRes.json().catch(() => ({}))) as {
        petShops?: PetShop[];
        error?: string;
      };
      const communityData = (await communityRes.json().catch(() => ({}))) as {
        alerts?: CommunityAlert[];
      };
      const lostData = (await lostRes.json().catch(() => ({}))) as {
        alerts?: LostAlert[];
      };

      if (!annRes.ok) throw new Error(annData.error || "No se pudieron cargar avisos");
      if (!shopRes.ok) throw new Error(shopData.error || "No se pudieron cargar comercios");

      setItems(Array.isArray(annData.announcements) ? annData.announcements : []);
      setShops(Array.isArray(shopData.petShops) ? shopData.petShops : []);
      setCommunityAlerts(Array.isArray(communityData.alerts) ? communityData.alerts : []);
      setLostAlerts(
        Array.isArray(lostData.alerts)
          ? lostData.alerts.filter((a) => a.isLost)
          : [],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (section !== "map") {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function mountMap() {
      const host = mapHostRef.current;
      if (!host) return;
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapHostRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        host.innerHTML = "";
        const map = L.map(host, { zoomControl: true });
        map.setView(MDP_CENTER, 13);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          maxZoom: 19,
        }).addTo(map);

        const layer = L.layerGroup().addTo(map);
        for (const shop of shops) {
          if (shop.latitude == null || shop.longitude == null || !shop.isActive) continue;
          const color = shop.type === "veterinary" ? "#f59e0b" : "#38bdf8";
          const marker = L.circleMarker([shop.latitude, shop.longitude], {
            radius: 9,
            color,
            fillColor: color,
            fillOpacity: 0.85,
            weight: 2,
          });
          marker.bindPopup(
            `<strong>${shop.name}</strong><br/><span style="opacity:.8">${typeLabel(shop.type)}</span>${
              shop.address ? `<br/>${shop.address}` : ""
            }`,
          );
          layer.addLayer(marker);
        }

        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 80);
      } catch {
        /* mapa opcional si CDN falla */
      }
    }

    void mountMap();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [section, shops]);

  async function onPublish(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/announcements/admin", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          tag,
          isPublished: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (res.status === 401 || res.status === 403) {
        safeNavigate("/admin-login/");
        return;
      }
      if (!res.ok) throw new Error(data.error || data.message || "No se pudo publicar");
      setTitle("");
      setBody("");
      setOkMsg("Aviso publicado. Ya es visible en la landing.");
      showToast("Aviso de red publicado con éxito");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar");
    } finally {
      setSaving(false);
    }
  }

  async function onRegisterShop(event: FormEvent) {
    event.preventDefault();
    setSavingShop(true);
    setShopError(null);
    try {
      const latitude = Number(shopLat.replace(",", "."));
      const longitude = Number(shopLng.replace(",", "."));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Latitud y longitud deben ser números válidos");
      }

      const res = await fetch("/api/pet-shops/admin", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: shopName.trim(),
          type: shopType,
          address: shopAddress.trim() || null,
          latitude,
          longitude,
          isActive: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (res.status === 401 || res.status === 403) {
        safeNavigate("/admin-login/");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || data.message || "No se pudo registrar el comercio");
      }

      setShopName("");
      setShopAddress("");
      setShopLat("");
      setShopLng("");
      setShopType("veterinary");
      showToast("¡Comercio adherido con éxito al mapa de Mar del Plata!");
      await load();
    } catch (err) {
      setShopError(err instanceof Error ? err.message : "Error al registrar comercio");
    } finally {
      setSavingShop(false);
    }
  }

  async function togglePublish(item: Announcement) {
    setError(null);
    try {
      const res = await fetch(`/api/announcements/admin/${item.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      if (res.status === 401 || res.status === 403) {
        safeNavigate("/admin-login/");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo actualizar");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  async function removeItem(id: string) {
    if (!window.confirm("¿Eliminar este aviso de forma permanente?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/announcements/admin/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        safeNavigate("/admin-login/");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo eliminar");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  async function toggleShopActive(shop: PetShop) {
    setShopError(null);
    try {
      const res = await fetch(`/api/pet-shops/admin/${shop.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !shop.isActive }),
      });
      if (res.status === 401 || res.status === 403) {
        safeNavigate("/admin-login/");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo actualizar el comercio");
      }
      await load();
    } catch (err) {
      setShopError(err instanceof Error ? err.message : "Error al actualizar comercio");
    }
  }

  function logout() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(EMAIL_KEY);
      sessionStorage.removeItem(NAME_KEY);
      sessionStorage.removeItem(ADMIN_FLAG_KEY);
    } catch {
      /* silencioso */
    }
    safeNavigate("/admin-login/");
  }

  const inputClass =
    "min-h-11 w-full rounded-xl border border-border bg-night/70 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-mustard/60 focus:ring-2 focus:ring-mustard/20";

  const navBtn = (id: HubSection, label: string, hint: string) => {
    const active = section === id;
    return (
      <button
        type="button"
        onClick={() => setSection(id)}
        className={`w-full rounded-2xl px-3 py-3 text-left transition ${
          active
            ? "border border-mustard/50 bg-honey/15 text-white shadow-honey"
            : "border border-transparent text-white/70 hover:border-white/10 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-0.5 block text-[11px] text-white/45">{hint}</span>
      </button>
    );
  };

  return (
    <div className="min-h-dvh bg-night text-white lg:flex">
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-mustard/50 bg-card px-4 py-3 text-center text-sm font-semibold text-white shadow-mustard"
        >
          {toast}
        </div>
      ) : null}

      <aside className="flex w-full flex-col border-b border-border bg-[#0b1220] lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-mustard">
            Master Admin Hub
          </p>
          <h1 className="mt-1 text-lg font-extrabold text-white">Honey App</h1>
          <p className="mt-2 truncate text-xs text-white/50">
            {adminName}
            {adminEmail ? ` · ${adminEmail}` : ""}
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sesión admin activa
          </span>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible lg:p-4">
          {navBtn("map", "Mapa y Alertas", "Pines MDP + reportes vecinos")}
          {navBtn("network", "Consola de Red", "Zoonosis y avisos públicos")}
          {navBtn("shops", "Registrar Comercios", "Veterinarias y Pet Shops")}
        </nav>

        <div className="mt-auto space-y-2 border-t border-border p-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-mustard/45 bg-honey/10 px-4 text-sm font-bold text-mustard transition hover:bg-honey/20"
          >
            Ver Landing Pública
          </a>
          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-xs text-white/45 hover:text-white/80"
          >
            Cerrar sesión admin
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-night/95 px-4 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-mustard">
              {section === "map"
                ? "Operaciones en vivo"
                : section === "network"
                  ? "Comunicación de red"
                  : "Aliados comerciales"}
            </p>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">
              {section === "map"
                ? "Mapa y Alertas"
                : section === "network"
                  ? "Consola de Red"
                  : "Registrar Comercios"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-white/70 hover:border-mustard/40 hover:text-white"
            >
              Actualizar datos
            </button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-honey px-4 py-2 text-xs font-bold text-white shadow-honey hover:bg-honey-hover"
            >
              Ir a la Web
            </a>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6">
          {section === "map" ? (
            <div className="grid gap-5 xl:grid-cols-5">
              <section className="overflow-hidden rounded-chapita border border-mustard/30 bg-card shadow-mustard xl:col-span-3">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-bold text-white">Mapa Mar del Plata</h3>
                  <span className="text-xs text-white/50">
                    {shops.filter((s) => s.isActive && s.latitude != null).length} pines activos
                  </span>
                </div>
                <div
                  ref={mapHostRef}
                  className="h-[420px] w-full bg-[#0b1220] sm:h-[520px]"
                />
              </section>

              <section className="space-y-4 xl:col-span-2">
                <PanelCard title="Alertas de vecinos (chapitas)">
                  {loading ? (
                    <p className="text-sm text-white/50">Cargando…</p>
                  ) : lostAlerts.length === 0 ? (
                    <p className="text-sm text-white/50">Sin mascotas en búsqueda ahora.</p>
                  ) : (
                    <ul className="space-y-2">
                      {lostAlerts.slice(0, 6).map((a) => (
                        <li
                          key={a.id}
                          className="flex gap-3 rounded-xl border border-border/60 bg-night/50 p-2"
                        >
                          {a.photoUrl ? (
                            <img
                              src={a.photoUrl}
                              alt=""
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-night" />
                          )}
                          <div>
                            <p className="font-bold text-white">{a.name}</p>
                            <p className="text-xs text-red-300">En búsqueda</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </PanelCard>

                <PanelCard title="Alertas solidarias (calle)">
                  {communityAlerts.length === 0 ? (
                    <p className="text-sm text-white/50">Sin reportes callejeros abiertos.</p>
                  ) : (
                    <ul className="space-y-2">
                      {communityAlerts.slice(0, 6).map((a) => (
                        <li
                          key={a.id}
                          className="flex gap-3 rounded-xl border border-border/60 bg-night/50 p-2"
                        >
                          <img
                            src={a.photoUrl}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-bold capitalize text-white">{a.species}</p>
                            <p className="text-xs text-mustard">{a.zone}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </PanelCard>
              </section>
            </div>
          ) : null}

          {section === "network" ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <section className="rounded-chapita border border-mustard/35 bg-card p-5 shadow-mustard sm:p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-mustard">
                  Nuevo aviso
                </h3>
                <form className="space-y-4" onSubmit={onPublish}>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="tag">
                      Categoría
                    </label>
                    <select
                      id="tag"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className={inputClass}
                    >
                      {TAGS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="title">
                      Título
                    </label>
                    <input
                      id="title"
                      required
                      minLength={3}
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: Alerta zoonosis — vacunación antirrábica en MDP"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="body">
                      Contenido
                    </label>
                    <textarea
                      id="body"
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={5}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Escribí el aviso completo. La comunidad lo verá de inmediato."
                      className="w-full rounded-xl border border-border bg-night/70 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-mustard/60"
                    />
                  </div>
                  {error ? (
                    <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                      {error}
                    </p>
                  ) : null}
                  {okMsg ? (
                    <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
                      {okMsg}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-honey px-6 text-sm font-bold text-white shadow-honey hover:bg-honey-hover disabled:opacity-60"
                  >
                    {saving ? "Publicando…" : "Publicar ahora"}
                  </button>
                </form>
              </section>

              <section className="rounded-chapita border border-border bg-card p-5 sm:p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/70">
                  Avisos publicados
                </h3>
                {loading ? (
                  <p className="text-sm text-white/50">Cargando…</p>
                ) : items.length === 0 ? (
                  <p className="text-sm text-white/50">Todavía no hay avisos.</p>
                ) : (
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-border/70 bg-night/50 p-4"
                      >
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-honey/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-honey">
                            {item.tag}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              item.isPublished ? "text-emerald-400" : "text-white/40"
                            }`}
                          >
                            {item.isPublished ? "En vivo" : "Oculto"}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white">{item.title}</h4>
                        <p className="mt-1 text-sm text-white/65">{item.body}</p>
                        <div className="mt-3 flex gap-3">
                          <button
                            type="button"
                            onClick={() => void togglePublish(item)}
                            className="text-xs font-semibold text-mustard hover:underline"
                          >
                            {item.isPublished ? "Ocultar" : "Volver a publicar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeItem(item.id)}
                            className="text-xs font-semibold text-red-300/90 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}

          {section === "shops" ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <section className="rounded-chapita border border-mustard/35 bg-card p-5 shadow-mustard sm:p-6">
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-mustard">
                  Nuevo comercio aliado
                </h3>
                <p className="mb-4 text-xs text-white/50">
                  Se guarda en Neon y aparece como pin en el mapa del hub y en `/dashboard`.
                </p>
                <form className="space-y-4" onSubmit={onRegisterShop}>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="shop-name">
                      Nombre del local
                    </label>
                    <input
                      id="shop-name"
                      required
                      minLength={2}
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Ej: Veterinaria Atlántica"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="shop-type">
                      Tipo
                    </label>
                    <select
                      id="shop-type"
                      value={shopType}
                      onChange={(e) =>
                        setShopType(e.target.value as "veterinary" | "petshop")
                      }
                      className={inputClass}
                    >
                      <option value="veterinary">Veterinaria</option>
                      <option value="petshop">Pet Shop</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="shop-address">
                      Dirección
                    </label>
                    <input
                      id="shop-address"
                      value={shopAddress}
                      onChange={(e) => setShopAddress(e.target.value)}
                      placeholder="Ej: Av. Colón 3200, Mar del Plata"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="shop-lat">
                        Latitud
                      </label>
                      <input
                        id="shop-lat"
                        required
                        inputMode="decimal"
                        value={shopLat}
                        onChange={(e) => setShopLat(e.target.value)}
                        placeholder="-38.0022"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="shop-lng">
                        Longitud
                      </label>
                      <input
                        id="shop-lng"
                        required
                        inputMode="decimal"
                        value={shopLng}
                        onChange={(e) => setShopLng(e.target.value)}
                        placeholder="-57.5485"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  {shopError ? (
                    <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                      {shopError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={savingShop}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-honey px-6 text-sm font-bold text-white shadow-honey hover:bg-honey-hover disabled:opacity-60"
                  >
                    {savingShop ? "Adhiriendo…" : "Adherir al mapa"}
                  </button>
                </form>
              </section>

              <section className="rounded-chapita border border-border bg-card p-5 sm:p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/70">
                  Comercios en el mapa
                </h3>
                {loading ? (
                  <p className="text-sm text-white/50">Cargando…</p>
                ) : shops.length === 0 ? (
                  <p className="text-sm text-white/50">Todavía no hay comercios.</p>
                ) : (
                  <ul className="space-y-3">
                    {shops.map((shop) => (
                      <li
                        key={shop.id}
                        className="rounded-2xl border border-border/70 bg-night/50 p-4"
                      >
                        <div className="mb-1 flex flex-wrap gap-2">
                          <span className="rounded-full bg-honey/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-honey">
                            {typeLabel(shop.type)}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              shop.isActive ? "text-emerald-400" : "text-white/40"
                            }`}
                          >
                            {shop.isActive ? "Activo" : "Oculto"}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white">{shop.name}</h4>
                        <p className="mt-1 text-sm text-white/60">
                          {shop.address || "Sin dirección"}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-white/40">
                          {shop.latitude}, {shop.longitude}
                        </p>
                        <button
                          type="button"
                          onClick={() => void toggleShopActive(shop)}
                          className="mt-3 text-xs font-semibold text-mustard hover:underline"
                        >
                          {shop.isActive ? "Desactivar pin" : "Activar pin"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function PanelCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-chapita border border-border bg-card p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}
