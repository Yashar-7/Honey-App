import { z } from "zod";
import { AppError } from "../middleware/errorHandler";

export const createMessageFieldsSchema = z.object({
  text: z.string().optional(),
  locationReference: z.string().optional(),
});

export type CreateMessageInput = {
  text?: string;
  locationReference?: string;
  imageUrl?: string | null;
};

export function parseCreateMessageInput(
  body: unknown,
  hasImage: boolean,
): CreateMessageInput {
  const raw = createMessageFieldsSchema.parse(body);
  const text = raw.text?.trim() || undefined;
  const locationReference = raw.locationReference?.trim() || undefined;

  if (!text && !locationReference && !hasImage) {
    throw new AppError(
      400,
      "Debe incluir al menos text, locationReference o una imagen",
    );
  }

  return { text, locationReference };
}

export const replyMessageSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

export type ReplyMessageInput = z.infer<typeof replyMessageSchema>;

export const MESSAGE_SENDER = {
  FINDER: "finder",
  OWNER: "owner",
} as const;

export type MessageSender =
  (typeof MESSAGE_SENDER)[keyof typeof MESSAGE_SENDER];
