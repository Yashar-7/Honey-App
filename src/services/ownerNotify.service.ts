import { notifyPetOwner } from "./push.service";
import { broadcastWarRoomUpdate } from "./realtime.service";

export type OwnerPetEvent = {
  type: string;
  petId: string;
  sessionId?: string;
  petName: string;
  body: string;
};

/**
 * Orquestador único: Realtime para dashboard abierto + Web Push para pestaña cerrada.
 */
export async function notifyOwnerOfPetEvent(
  ownerUserId: string,
  event: OwnerPetEvent,
) {
  await broadcastWarRoomUpdate(ownerUserId, event);

  void notifyPetOwner(ownerUserId, {
    title:
      event.type === "gps_scan"
        ? `📍 ${event.petName}`
        : event.type === "qr_open"
          ? `🔔 ${event.petName}`
          : `💬 ${event.petName}`,
    body: event.body,
    url: "/dashboard",
    tag: `${event.type}:${event.petId}`,
    data: {
      type: event.type,
      petId: event.petId,
      ...(event.sessionId ? { sessionId: event.sessionId } : {}),
    },
  });
}
