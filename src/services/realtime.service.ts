import { getSupabaseAdmin } from "../lib/supabase";

const BROADCAST_TIMEOUT_MS = 5000;

/**
 * Publica un evento en el canal Realtime del War Room del dueño.
 * Falla en silencio para no bloquear el flujo principal (chat, GPS, etc.).
 */
export async function broadcastWarRoomUpdate(
  ownerUserId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const channel = supabase.channel(`war-room:${ownerUserId}`, {
      config: { broadcast: { self: false } },
    });

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        void supabase.removeChannel(channel);
        console.warn(
          `[realtime] broadcast timeout war-room:${ownerUserId}`,
        );
        resolve();
      }, BROADCAST_TIMEOUT_MS);

      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;

        void channel
          .send({
            type: "broadcast",
            event: "war_room_update",
            payload,
          })
          .then(() => {
            clearTimeout(timeout);
            void supabase.removeChannel(channel);
            resolve();
          })
          .catch((err: unknown) => {
            clearTimeout(timeout);
            void supabase.removeChannel(channel);
            console.warn("[realtime] broadcast send failed:", err);
            resolve();
          });
      });
    });
  } catch (err) {
    console.warn("[realtime] broadcastWarRoomUpdate failed:", err);
  }
}
