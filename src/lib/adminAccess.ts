/** Emails autorizados para rutas /admin (comma-separated). Fail-closed si vacío. */
export function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim() || "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string): boolean {
  const allow = getAdminEmailAllowlist();
  if (allow.size === 0) return false;
  return allow.has(email.trim().toLowerCase());
}
