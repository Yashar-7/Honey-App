"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { STORAGE_KEY } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  tag: string;
  isPublished: boolean;
  publishedAt: string;
  createdAt?: string;
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

const TAGS = ["Zoonosis", "Comunidad", "Prevención", "Cuidado", "Urgente"] as const;
const TOAST_MS = 4200;

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
 * Consola admin: avisos (zoonosis) + comercios aliados (mapa MDP).
 */
export default function AdminConsolePage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [shops, setShops] = useState<PetShop[]>([]);
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

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [annRes, shopRes] = await Promise.all([
        fetch("/api/announcements/admin", { headers: authHeaders() }),
        fetch("/api/pet-shops/admin", { headers: authHeaders() }),
      ]);

      if (annRes.status === 401 || annRes.status === 403 || shopRes.status === 401 || shopRes.status === 403) {
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

      if (!annRes.ok) throw new Error(annData.error || "No se pudieron cargar avisos");
      if (!shopRes.ok) throw new Error(shopData.error || "No se pudieron cargar comercios");

      setItems(Array.isArray(annData.announcements) ? annData.announcements : []);
      setShops(Array.isArray(shopData.petShops) ? shopData.petShops : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      if (!res.ok) {
        throw new Error(data.error || data.message || "No se pudo publicar");
      }
      setTitle("");
      setBody("");
      setOkMsg("Aviso publicado. Ya es visible en la landing.");
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

  const inputClass =
    "min-h-11 w-full rounded-xl border border-border bg-night/70 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-mustard/60 focus:ring-2 focus:ring-mustard/20";

  return (
    <main className="relative min-h-dvh bg-night px-4 py-8 sm:px-6">
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-mustard/50 bg-card px-4 py-3 text-center text-sm font-semibold text-white shadow-mustard"
        >
          {toast}
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-mustard">
              Consola Honey App
            </p>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
              Control de red
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              Publicá avisos de zoonosis y sumá veterinarias / pet shops al mapa
              vivo de Mar del Plata.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <a
              href="/dashboard"
              className="text-sm font-semibold text-mustard hover:underline"
            >
              Ir al panel dueño
            </a>
            <a href="/" className="text-sm text-white/50 hover:text-white/80">
              Ver landing
            </a>
          </div>
        </header>

        {/* —— AVISOS —— */}
        <section className="mb-8 rounded-chapita border border-mustard/35 bg-card p-5 shadow-mustard sm:p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-mustard">
            Nuevo aviso
          </h2>
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
                className="w-full rounded-xl border border-border bg-night/70 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-mustard/60 focus:ring-2 focus:ring-mustard/20"
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
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-honey px-6 text-sm font-bold text-white shadow-honey hover:bg-honey-hover disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Publicando…" : "Publicar ahora"}
            </button>
          </form>
        </section>

        <section className="mb-8 rounded-chapita border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">
              Avisos publicados
            </h2>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-semibold text-mustard hover:underline"
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-white/50">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-white/50">
              Todavía no hay avisos. Publicá el primero arriba.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-border/70 bg-night/50 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
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
                  <h3 className="font-extrabold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    {item.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
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

        {/* —— COMERCIOS —— */}
        <section className="mb-8 rounded-chapita border border-mustard/35 bg-card p-5 shadow-mustard sm:p-6">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-mustard">
            Nuevo comercio aliado
          </h2>
          <p className="mb-4 text-xs text-white/50">
            Se guarda en Neon (`pet_shops`) y aparece como pin en `/dashboard` y
            en el mapa de la landing.
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
                maxLength={120}
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
                maxLength={240}
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
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-honey px-6 text-sm font-bold text-white shadow-honey hover:bg-honey-hover disabled:opacity-60 sm:w-auto"
            >
              {savingShop ? "Adhiriendo…" : "Adherir al mapa"}
            </button>
          </form>
        </section>

        <section className="rounded-chapita border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/70">
            Comercios en el mapa
          </h2>
          {loading ? (
            <p className="text-sm text-white/50">Cargando…</p>
          ) : shops.length === 0 ? (
            <p className="text-sm text-white/50">
              Todavía no hay comercios. Cargá el primero arriba para sacar el
              dashboard de “0 puntos seguros”.
            </p>
          ) : (
            <ul className="space-y-3">
              {shops.map((shop) => (
                <li
                  key={shop.id}
                  className="rounded-2xl border border-border/70 bg-night/50 p-4"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-honey/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-honey">
                      {typeLabel(shop.type)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        shop.isActive ? "text-emerald-400" : "text-white/40"
                      }`}
                    >
                      {shop.isActive ? "Activo en mapa" : "Oculto"}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-white">{shop.name}</h3>
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
    </main>
  );
}
