#!/usr/bin/env node
/**
 * Honey App — QA Test Suite (local)
 *
 * Uso:
 *   node test-suite.js
 *   BASE_URL=http://localhost:3000 QR_TOKEN=demo-qr-token-abc123 node test-suite.js
 *
 * Requisito: servidor corriendo (`npm run dev` desde la raíz del proyecto)
 */

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const QR_TOKEN_REAL = process.env.QR_TOKEN || "demo-qr-token-abc123";
const QR_TOKEN_FAKE = "token-inexistente";
const CHAT_BURST_COUNT = 10;
const CHAT_WARMUP = true;
/** Umbrales locales (Neon remoto); ajustá si corrés 100% en localhost sin DB remota */
const CHAT_MAX_MS_PER_MSG = 2500;
const CHAT_MAX_TOTAL_MS = 12000;

const FORBIDDEN_KEYS = [
  "phone",
  "whatsapp",
  "telefono",
  "tel",
  "mobile",
  "celular",
  "email",
  "password",
  "passwordhash",
];

const results = [];

function logPass(name, detail = "") {
  console.log(`TEST PASSED ✅  ${name}${detail ? `\n           ${detail}` : ""}`);
  results.push({ name, ok: true });
}

function logFail(name, detail = "") {
  console.log(`TEST FAILED ❌  ${name}${detail ? `\n           ${detail}` : ""}`);
  results.push({ name, ok: false, detail });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collectForbiddenKeys(obj, path = "root", found = []) {
  if (obj == null || typeof obj !== "object") return found;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => collectForbiddenKeys(item, `${path}[${i}]`, found));
    return found;
  }

  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_KEYS.some((f) => lower.includes(f))) {
      found.push(`${path}.${key}`);
    }
    collectForbiddenKeys(value, `${path}.${key}`, found);
  }
  return found;
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  let body;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { res, body, url };
}

async function checkServerUp() {
  try {
    const { res } = await request("/health");
    assert(res.ok, `HTTP ${res.status}`);
    return true;
  } catch (err) {
    logFail(
      "Preflight · Servidor accesible",
      `${BASE_URL} no responde. ¿Está corriendo npm run dev? (${err.message})`,
    );
    return false;
  }
}

async function testQrUnregisteredToken() {
  const name = "Integración QR · token inexistente → 404 sin redirigir a registro";
  try {
    const { res, body } = await request(`/api/qr/${encodeURIComponent(QR_TOKEN_FAKE)}`);

    assert(res.status === 404, `HTTP ${res.status} — se esperaba 404`);
    assert(
      typeof body.error === "string" && body.error.length > 0,
      "Falta error descriptivo",
    );

    logPass(name, `GET /api/qr/${QR_TOKEN_FAKE} → 404 ${body.error}`);
  } catch (err) {
    logFail(name, err.message);
  }
}

async function testQrTokenWithoutLeadingUnderscore() {
  const name = "Integración QR · token sin '_' inicial (alias Nieve)";
  const tokenSinUnderscore = "_ID8cI1wZetjMStmecW-sRBa1_GpLtCX".slice(1);
  try {
    const { res, body } = await request(`/api/qr/${encodeURIComponent(tokenSinUnderscore)}`);

    assert(res.ok, `HTTP ${res.status}`);
    assert(body.isRegistered === true, `isRegistered=${body.isRegistered}`);
    assert(body.pet?.name?.toLowerCase() === "nieve", `pet.name=${body.pet?.name}`);

    logPass(name, `GET /api/qr/${tokenSinUnderscore} → "${body.pet.name}"`);
  } catch (err) {
    logFail(name, err.message);
  }
}

async function testQrRegisteredSanitized() {
  const name = "Integración QR · token real · ficha sanitizada sin contacto";
  try {
    const { res, body } = await request(`/api/qr/${encodeURIComponent(QR_TOKEN_REAL)}`);

    assert(res.ok, `HTTP ${res.status}`);
    assert(body.isRegistered === true, `isRegistered=${body.isRegistered}`);
    assert(body.pet && typeof body.pet === "object", "Falta objeto pet");
    assert(typeof body.pet.name === "string" && body.pet.name.length > 0, "pet.name vacío");
    assert(typeof body.contact?.sessionId === "string", "Falta contact.sessionId");

    const forbidden = collectForbiddenKeys(body);
    assert(forbidden.length === 0, `Campos prohibidos detectados: ${forbidden.join(", ")}`);

    const allowedPetKeys = new Set([
      "id",
      "name",
      "species",
      "breed",
      "age",
      "characteristics",
      "medicalConditions",
      "medications",
      "allergies",
      "behavioralNotes",
      "finderMessage",
      "photoUrl",
    ]);
    for (const key of Object.keys(body.pet)) {
      assert(allowedPetKeys.has(key), `Campo pet inesperado expuesto: ${key}`);
    }

    logPass(
      name,
      `Mascota "${body.pet.name}" · sessionId ${body.contact.sessionId.slice(0, 8)}… · 0 campos sensibles`,
    );
    return body.contact.sessionId;
  } catch (err) {
    logFail(name, err.message);
    return null;
  }
}

async function testChatBurst(sessionId) {
  const name = `Carga Chat · ${CHAT_BURST_COUNT} mensajes rápidos consecutivos`;
  if (!sessionId) {
    logFail(name, "Sin sessionId (falló el test QR anterior)");
    return;
  }

  try {
    if (CHAT_WARMUP) {
      const warmForm = new FormData();
      warmForm.append("text", "[QA warmup] pre-calentamiento de sesión");
      const warm = await request(
        `/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
        { method: "POST", body: warmForm },
      );
      assert(warm.res.status === 201, `Warmup: HTTP ${warm.res.status}`);
    }

    const started = performance.now();
    const latencies = [];

    for (let i = 1; i <= CHAT_BURST_COUNT; i += 1) {
      const t0 = performance.now();
      const form = new FormData();
      form.append("text", `[QA burst ${i}/${CHAT_BURST_COUNT}] ${new Date().toISOString()}`);

      const { res, body } = await request(
        `/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
        { method: "POST", body: form },
      );

      const elapsed = performance.now() - t0;
      latencies.push(elapsed);

      assert(res.status === 201, `Mensaje #${i}: HTTP ${res.status} — ${JSON.stringify(body)}`);
      assert(body.data?.id || body.message, `Mensaje #${i}: respuesta sin confirmación`);
      assert(elapsed <= CHAT_MAX_MS_PER_MSG, `Mensaje #${i}: ${elapsed.toFixed(0)}ms > ${CHAT_MAX_MS_PER_MSG}ms`);
    }

    const total = performance.now() - started;
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const max = Math.max(...latencies);

    assert(total <= CHAT_MAX_TOTAL_MS, `Total ${total.toFixed(0)}ms > ${CHAT_MAX_TOTAL_MS}ms`);

    logPass(
      name,
      `${CHAT_BURST_COUNT}/${CHAT_BURST_COUNT} OK · total ${total.toFixed(0)}ms · avg ${avg.toFixed(0)}ms · max ${max.toFixed(0)}ms`,
    );
  } catch (err) {
    logFail(name, err.message);
  }
}

async function main() {
  console.log("\n🐾 Honey App — QA Test Suite");
  console.log(`   Base URL : ${BASE_URL}`);
  console.log(`   QR token : ${QR_TOKEN_REAL}`);
  console.log("─".repeat(52));

  const up = await checkServerUp();
  if (!up) {
    printSummary();
    process.exit(1);
  }
  logPass("Preflight · Servidor accesible", "GET /health → ok");

  await testQrUnregisteredToken();
  await testQrTokenWithoutLeadingUnderscore();
  const sessionId = await testQrRegisteredSanitized();
  await testChatBurst(sessionId);

  printSummary();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log("─".repeat(52));
  console.log(`Resumen: ${passed} passed · ${failed} failed · ${results.length} total\n`);
}

main().catch((err) => {
  console.error("Error fatal en test-suite:", err);
  process.exit(1);
});
