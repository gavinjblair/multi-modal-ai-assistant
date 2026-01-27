export async function onRequest(context) {
  const { request, env } = context;

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

  const baseUrl = env.API_BASE_URL || env.VITE_API_BASE_URL;
  if (!baseUrl) {
    return new Response(JSON.stringify({ detail: "API base URL not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = new URL(baseUrl);
  const upstreamPath = upstream.pathname.replace(/\/$/, "");
  upstream.pathname = `${upstreamPath}/api/ask`;
  upstream.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(upstream.toString(), {
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
