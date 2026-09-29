import "server-only";

import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import type { PatientRegistrationPayload } from "@/types/matching";

let lambdaClient: LambdaClient | undefined;

function configuration() {
  const region = process.env.AWS_REGION?.trim();
  const functionName = process.env.MATCHING_LAMBDA_NAME?.trim();

  if (!region) throw new Error("AWS_REGION ainda não foi configurada.");
  if (!functionName) throw new Error("MATCHING_LAMBDA_NAME ainda não foi configurada.");
  return { region, functionName };
}

function client(region: string) {
  if (!lambdaClient) lambdaClient = new LambdaClient({ region });
  return lambdaClient;
}

function decodePayload(payload?: Uint8Array) {
  if (!payload?.length) return null;
  const text = new TextDecoder().decode(payload);

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function invokeMatchingLambda(
  payload: PatientRegistrationPayload | PatientRegistrationPayload[]
) {
  const { region, functionName } = configuration();
  const response = await client(region).send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "Event",
      Payload: new TextEncoder().encode(JSON.stringify(payload))
    })
  );
  const body = decodePayload(response.Payload);

  if (response.FunctionError) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`A Lambda de matching retornou erro: ${detail.slice(0, 300)}`);
  }

  return {
    statusCode: response.StatusCode ?? 200,
    body
  };
}
