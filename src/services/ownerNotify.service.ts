import { notifyPetOwner } from "./push.service";
import { broadcastWarRoomUpdate } from "./realtime.service";

export type OwnerPetEvent = {
  type: string;
  petId: string;
  sessionId?: string;
  petName: string;
  body: string;
  addressLabel?: string;
  autoOpenChat?: boolean;
};

function buildPushTitle(event: OwnerPetEvent): string {
  switch (event.type) {
    case "gps_scan":
      return `📍 ${event.petName} encontrada`;
    case "neighborhood_help_owner":
      return `🆘 ${event.petName}`;
    case "qr_open":
      return `🔔 ${event.petName}`;
    case "pet_returned":
      return `🎉 ${event.petName}`;
    case "case_resolved":
      return `✅ ${event.petName}`;
    default:
      return `💬 ${event.petName}`;
  }
}

/**
 * Orquestador único: Realtime para dashboard abierto + Web Push para pestaña cerrada.
 */
export async function notifyOwnerOfPetEvent(
  ownerUserId: string,
  event: OwnerPetEvent,
) {
  await broadcastWarRoomUpdate(ownerUserId, {
    ...event,
    autoOpenChat: Boolean(
      event.autoOpenChat ??
        (event.sessionId &&
          (event.type === "gps_scan" || event.type === "chat_message")),
    ),
  });

  void notifyPetOwner(ownerUserId, {
    title: buildPushTitle(event),
    body: event.body,
    url: "/dashboard",
    tag: `${event.type}:${event.petId}`,
    data: {
      type: event.type,
      petId: event.petId,
      ...(event.sessionId ? { sessionId: event.sessionId } : {}),
      ...(event.addressLabel ? { addressLabel: event.addressLabel } : {}),
    },
  });
}
