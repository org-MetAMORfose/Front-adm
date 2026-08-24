import "server-only";

import { prisma } from "@/lib/db";
import { getMediaType } from "@/lib/media";
import type { Conversation, Message, Professional } from "@/types";

export async function getConversations(): Promise<Conversation[]> {
  const people = await prisma.person.findMany({
    include: {
      message_history: {
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: 1
      }
    }
  });

  return people
    .map((person) => {
      const lastMessage = person.message_history[0];

      return {
        person_id: person.id,
        phone_number: person.phone_number,
        chat_state: person.chat_state,
        chat_mode: person.chat_mode,
        name: person.name,
        channel: person.channel,
        person_created_at: person.created_at.toISOString(),
        last_message_id: lastMessage?.id ?? null,
        last_message_content: lastMessage?.content ?? null,
        last_message_media_type: getMediaType(lastMessage?.media_path ?? null),
        last_message_is_from_user: lastMessage?.is_from_user ?? null,
        last_message_created_at: lastMessage?.created_at.toISOString() ?? null
      };
    })
    .sort((a, b) =>
      (b.last_message_created_at ?? b.person_created_at).localeCompare(
        a.last_message_created_at ?? a.person_created_at
      )
    );
}

export async function getMessagesByPersonId(personId: number): Promise<Message[]> {
  const messages = await prisma.message_history.findMany({
    where: { person_id: personId },
    orderBy: [{ created_at: "asc" }, { id: "asc" }]
  });

  return messages.map((message) => ({
    id: message.id,
    person_id: message.person_id,
    created_at: message.created_at.toISOString(),
    content: message.content,
    media_type: getMediaType(message.media_path),
    is_from_user: message.is_from_user
  }));
}

export async function getProfessionalByPersonId(
  personId: number
): Promise<Professional | null> {
  const professional = await prisma.professional.findUnique({
    where: { person_id: personId }
  });

  if (!professional) return null;

  return {
    ...professional,
    created_at: professional.created_at.toISOString()
  };
}

export async function getAnyPersonId(): Promise<number | null> {
  const person = await prisma.person.findFirst({
    orderBy: { created_at: "desc" },
    select: { id: true }
  });

  return person?.id ?? null;
}
