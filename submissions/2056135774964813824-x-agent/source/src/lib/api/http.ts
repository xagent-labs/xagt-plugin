/** JSON helpers for App Router route handlers. */
export function jsonResponse(
  status: number,
  body: Record<string, unknown> | object,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}
