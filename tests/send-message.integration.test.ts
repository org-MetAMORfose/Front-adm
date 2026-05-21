import { describe, expect, it } from "vitest";

import { POST as postSendMessage } from "@/app/api/admin/send-message/route";

const shouldRunIntegrationTest =
  process.env.RUN_SEND_MESSAGE_INTEGRATION_TEST === "true" &&
  Boolean(process.env.SEND_MESSAGE_URL) &&
  Boolean(process.env.TEST_PHONE_NUMBER);

const runSendMessageTest = shouldRunIntegrationTest
  ? describe
  : describe.skip;

runSendMessageTest("send-message integration", () => {
  it("sends a real automated test message", async () => {
    const response = await postSendMessage(
      new Request("http://localhost/api/admin/send-message", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          phone_number: process.env.TEST_PHONE_NUMBER,
          content: "Mensagem de teste automatizado"
        })
      })
    );

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  });
});