import "server-only";

import { query } from "@/lib/db";
import type { Conversation, Message, Professional } from "@/types";

function asIsoDate<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value
    ])
  ) as T;
}

export async function getConversations(): Promise<Conversation[]> {
  const result = await query<Conversation>(
    `
      WITH latest_message AS (
        SELECT DISTINCT ON (person_id)
          id,
          person_id,
          content,
          image_url,
          document_url,
          is_from_user,
          created_at
        FROM message_history
        ORDER BY person_id, created_at DESC, id DESC
      )
      SELECT
        p.id AS person_id,
        p.phone_number,
        p.chat_state,
        p.name,
        p.channel,
        p.created_at AS person_created_at,
        lm.id AS last_message_id,
        lm.content AS last_message_content,
        lm.image_url AS last_message_image_url,
        lm.document_url AS last_message_document_url,
        lm.is_from_user AS last_message_is_from_user,
        lm.created_at AS last_message_created_at
      FROM person p
      LEFT JOIN latest_message lm ON lm.person_id = p.id
      ORDER BY COALESCE(lm.created_at, p.created_at) DESC
    `
  );

  return result.rows.map((row) => asIsoDate(row));
}

export async function getMessagesByPersonId(personId: number): Promise<Message[]> {
  const result = await query<Message>(
    `
      SELECT
        id,
        person_id,
        created_at,
        content,
        image_url,
        document_url,
        is_from_user
      FROM message_history
      WHERE person_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [personId]
  );

  return result.rows.map((row) => asIsoDate(row));
}

export async function getProfessionalByPersonId(
  personId: number
): Promise<Professional | null> {
  const result = await query<Professional>(
    `
      SELECT
        pr.id,
        pr.person_id,
        pr.area,
        pr.professional_register,
        pr.register_type,
        pr.approach,
        pr.background,
        pr.video_platform,
        pr.email,
        pr.status_id,
        pr.created_at,
        psh.professional_status AS current_status,
        psh.created_at AS status_created_at
      FROM professional pr
      LEFT JOIN professional_status_history psh ON psh.id = pr.status_id
      WHERE pr.person_id = $1
      LIMIT 1
    `,
    [personId]
  );

  return result.rows[0] ? asIsoDate(result.rows[0]) : null;
}

export async function getAnyPersonId(): Promise<number | null> {
  const result = await query<{ id: number }>(
    "SELECT id FROM person ORDER BY created_at DESC LIMIT 1"
  );

  return result.rows[0]?.id ?? null;
}
