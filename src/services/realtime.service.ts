import { getSupabaseAdmin } from "../lib/supabase";

const BROADCAST_TIMEOUT_MS = 5000;

export type PublicRealtimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function getPublicRealtimeConfig(): PublicRealtimeConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

async function broadcastToChannel(
  channelName: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        void supabase.removeChannel(channel);
        console.warn(`[realtime] broadcast timeout ${channelName}`);
        resolve();
      }, BROADCAST_TIMEOUT_MS);

      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;

        void channel
          .send({
            type: "broadcast",
            event,
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
            console.warn(`[realtime] broadcast send failed (${channelName}):`, err);
            resolve();
          });
      });
    });
  } catch (err) {
    console.warn(`[realtime] broadcast failed (${channelName}):`, err);
  }
}

/**
 * Publica un evento en el canal Realtime del War Room del dueño.
 */
export async function broadcastWarRoomUpdate(
  ownerUserId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await broadcastToChannel(`war-room:${ownerUserId}`, "war_room_update", payload);
}

/** Notifica a dueño y rescatista que hay un mensaje nuevo en la sesión de chat. */
export async function broadcastChatSessionUpdate(
  sessionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await broadcastToChannel(`chat-session:${sessionId}`, "chat_update", payload);
}
