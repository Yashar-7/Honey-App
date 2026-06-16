/**
 * Cliente Supabase del navegador — instancia única (evita Multiple GoTrueClient).
 * Debe cargarse después del UMD de @supabase/supabase-js.
 */
(function initHoneySupabase(global) {
  /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
  let client = null;
  let clientSignature = null;

  const STORAGE_KEY = "honey-app-supabase-auth";

  const CLIENT_OPTIONS = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: STORAGE_KEY,
    },
  };

  /**
   * @param {string} supabaseUrl
   * @param {string} supabaseAnonKey
   * @returns {import('@supabase/supabase-js').SupabaseClient}
   */
  function getClient(supabaseUrl, supabaseAnonKey) {
    if (!global.supabase?.createClient) {
      throw new Error("Supabase JS SDK no cargado");
    }

    const url = String(supabaseUrl || "").trim();
    const key = String(supabaseAnonKey || "").trim();
    if (!url || !key) {
      throw new Error("Credenciales Supabase incompletas");
    }

    const signature = `${url}\0${key}`;
    if (client && clientSignature === signature) {
      return client;
    }

    client = global.supabase.createClient(url, key, CLIENT_OPTIONS);
    clientSignature = signature;
    return client;
  }

  function resetClient() {
    client = null;
    clientSignature = null;
  }

  function isAvailable() {
    return Boolean(global.supabase?.createClient);
  }

  global.HoneyAppSupabase = {
    getClient,
    resetClient,
    isAvailable,
    STORAGE_KEY,
  };
})(window);
