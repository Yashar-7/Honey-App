import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  CreateMessageInput,
  MESSAGE_SENDER,
  ReplyMessageInput,
} from "../schemas/message.schema";
import { notifyOwnerOfPetEvent } from "./ownerNotify.service";

const MESSAGE_SELECT = {
  id: true,
  sessionId: true,
  sender: true,
  text: true,
  locationReference: true,
  imageUrl: true,
  createdAt: true,
} as const;

function buildChatNotifyBody(message: {
  text: string | null;
  locationReference: string | null;
  imageUrl: string | null;
}): string {
  const parts: string[] = [];
  if (message.text) parts.push(message.text);
  if (message.locationReference) parts.push(message.locationReference);
  if (message.imageUrl) parts.push("Foto adjunta");
  return parts.join(" · ") || "Nuevo mensaje de un vecino";
}

async function getReadableSession(sessionId: string) {
  const session = await prisma.contactSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      pet: {
        select: {
          id: true,
          name: true,
          userId: true,
          isActive: true,
          isLost: true,
          lastLat: true,
          lastLng: true,
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!session) {
    throw new AppError(404, "Sesión de contacto no encontrada");
  }

  if (session.status !== "open") {
    throw new AppError(410, "Esta sesión de contacto fue cerrada");
  }

  if (session.expiresAt <= new Date()) {
    throw new AppError(410, "Esta sesión de contacto expiró");
  }

  if (!session.pet.isActive) {
    throw new AppError(410, "La mascota asociada ya no está activa");
  }

  return session;
}

export async function getSessionMessages(sessionId: string) {
  const session = await getReadableSession(sessionId);

  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: MESSAGE_SELECT,
  });

  return {
    sessionId,
    messages,
    pet: {
      id: session.pet.id,
      name: session.pet.name,
      isLost: session.pet.isLost,
      lastLat: session.pet.lastLat,
      lastLng: session.pet.lastLng,
    },
  };
}

export async function sendSessionMessage(
  sessionId: string,
  input: CreateMessageInput,
) {
  const session = await getReadableSession(sessionId);

  const message = await prisma.message.create({
    data: {
      sessionId: session.id,
      sender: MESSAGE_SENDER.FINDER,
      text: input.text ?? null,
      locationReference: input.locationReference ?? null,
      imageUrl: input.imageUrl ?? null,
    },
    select: MESSAGE_SELECT,
  });

  void notifyOwnerOfPetEvent(session.pet.userId, {
    type: "chat_message",
    petId: session.pet.id,
    sessionId: session.id,
    petName: session.pet.name,
    body: buildChatNotifyBody(message),
  });

  return {
    success: true,
    message: "Mensaje enviado al dueño correctamente",
    data: message,
  };
}

export async function replySessionMessage(
  sessionId: string,
  userId: string,
  input: ReplyMessageInput,
) {
  const session = await getReadableSession(sessionId);

  if (session.pet.userId !== userId) {
    throw new AppError(403, "No tenés permiso para responder en esta sesión");
  }

  const message = await prisma.message.create({
    data: {
      sessionId: session.id,
      sender: MESSAGE_SENDER.OWNER,
      text: input.text,
    },
    select: MESSAGE_SELECT,
  });

  return {
    message: "Respuesta enviada al vecino correctamente",
    data: message,
  };
}
