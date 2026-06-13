import { randomBytes } from "crypto";

const QR_TOKEN_BYTES = 24;

export function generateQrToken(): string {
  return randomBytes(QR_TOKEN_BYTES).toString("base64url");
}
