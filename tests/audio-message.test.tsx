// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { MessageBubble } from "@/components/MessageBubble";

describe("audio message", () => {
  it("renders the browser audio player for a received audio", () => {
    const { container } = render(
      <MessageBubble
        message={{
          id: 42,
          person_id: 7,
          created_at: "2026-10-11T12:00:00.000Z",
          content: null,
          media_type: "audio",
          is_from_user: true
        }}
        onImageClick={vi.fn()}
      />
    );

    const player = container.querySelector("audio");
    expect(player).not.toBeNull();
    expect(player?.getAttribute("src")).toBe(
      "/admin/api/admin/messages/42/media"
    );
    expect(player?.hasAttribute("controls")).toBe(true);
    expect(screen.getByText(/não suporta a reprodução de áudios/i)).toBeTruthy();
  });
});
