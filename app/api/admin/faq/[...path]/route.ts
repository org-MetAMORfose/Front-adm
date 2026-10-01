import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ path: string[] }> };

const allowedRoutes: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^knowledge-groups$/ },
  { method: "POST", pattern: /^knowledge-groups$/ },
  { method: "PATCH", pattern: /^knowledge-groups\/\d+$/ },
  { method: "DELETE", pattern: /^knowledge-groups\/\d+$/ },
  { method: "POST", pattern: /^knowledge-groups\/\d+\/questions$/ },
  { method: "DELETE", pattern: /^knowledge-entries\/\d+$/ }
];

function settings() {
  const baseUrl = process.env.CHATBOT_FAQ_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.CHATBOT_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

async function proxy(request: Request, context: RouteContext) {
  const config = settings();
  if (!config) {
    return NextResponse.json(
      { error: "A integração com o FAQ do chatbot ainda não foi configurada." },
      { status: 503 }
    );
  }

  const { path } = await context.params;
  const relativePath = path.join("/");
  const allowed = allowedRoutes.some(
    (route) => route.method === request.method && route.pattern.test(relativePath)
  );
  if (!allowed) {
    return NextResponse.json({ error: "Rota de FAQ não permitida." }, { status: 404 });
  }

  let body: string | undefined;
  if (request.method === "POST" || request.method === "PATCH") {
    body = await request.text();
    if (body.length > 250_000) {
      return NextResponse.json({ error: "O conteúdo do FAQ é muito grande." }, { status: 413 });
    }
  }

  try {
    const response = await fetch(`${config.baseUrl}/faq/${relativePath}`, {
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
export const PATCH = proxy;
export const DELETE = proxy;
