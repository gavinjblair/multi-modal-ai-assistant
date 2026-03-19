export async function onRequest(context) {
  const { request, env } = context;
  const API_BASE_URL =
    env.API_BASE_URL || env.VITE_API_BASE_URL || "https://vision-api.gavinblair7.workers.dev";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ detail: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(`${API_BASE_URL}/api/ask`, {
    method: request.method,
    headers,
    body: request.body,
  });

  const responseHeaders = new Headers(response.headers);
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
