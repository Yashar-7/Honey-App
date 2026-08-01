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

const TAGS = ["Zoonosis", "Comunidad", "Prevención", "Cuidado", "Urgente"] as const;

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

/**
 * Consola de control: publicar avisos (zoonosis, tips) en vivo para la red.
 */
export default function AdminConsolePage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<string>("Zoonosis");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements/admin", {
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        safeNavigate("/admin-login/");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        announcements?: Announcement[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar avisos");
      setItems(Array.isArray(data.announcements) ? data.announcements : []);
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

  return (
    <main className="min-h-dvh bg-night px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-mustard">
              Consola Honey App
            </p>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
              Control de avisos
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              Publicá zoonosis, tips y noticias locales. Aparecen al instante en
              la landing para toda la red.
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
                className="min-h-11 w-full rounded-xl border border-border bg-night/70 px-3 text-sm text-white outline-none focus:border-mustard/60"
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
                className="min-h-11 w-full rounded-xl border border-border bg-night/70 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-mustard/60"
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
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-honey px-6 text-sm font-bold text-white shadow-honey hover:bg-honey-hover disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Publicando…" : "Publicar ahora"}
            </button>
          </form>
        </section>

        <section className="rounded-chapita border border-border bg-card p-5 sm:p-6">
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
      </div>
    </main>
  );
}
