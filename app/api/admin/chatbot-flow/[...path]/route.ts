import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ path: string[] }> };

const allowedRoutes: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^revisions$/ },
  { method: "POST", pattern: /^revisions$/ },
  { method: "GET", pattern: /^revisions\/\d+$/ },
  { method: "DELETE", pattern: /^revisions\/\d+$/ },
  { method: "PUT", pattern: /^revisions\/\d+\/changes$/ },
  { method: "POST", pattern: /^revisions\/\d+\/(validate|publish)$/ }
];

function settings() {
  const baseUrl = process.env.CHATBOT_FLOW_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.CHATBOT_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

async function proxy(request: Request, context: RouteContext) {
  const config = settings();
  if (!config) {
    return NextResponse.json(
      { error: "A integração com o fluxo do chatbot ainda não foi configurada." },
      { status: 503 }
    );
  }

  const { path } = await context.params;
  const relativePath = path.join("/");
  const allowed = allowedRoutes.some(
    (route) => route.method === request.method && route.pattern.test(relativePath)
  );
  if (!allowed) {
    return NextResponse.json({ error: "Rota de fluxo não permitida." }, { status: 404 });
  }

  let body: string | undefined;
  if (request.method === "POST" || request.method === "PUT") {
    body = await request.text();
    if (body.length > 1_000_000) {
      return NextResponse.json({ error: "O lote de alterações é muito grande." }, { status: 413 });
    }
  }

  try {
    const response = await fetch(`${config.baseUrl}/chatbot-flow/${relativePath}`, {
      method: request.method,
      headers: {
        "X-Chatbot-Api-Key": config.apiKey,
        ...(body ? { "content-type": "application/json" } : {})
      },
      body,
      cache: "no-store"
    });
    const responseBody = await response.text();
    return new NextResponse(responseBody || null, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Não foi possível acessar o servidor do chatbot."
      },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
