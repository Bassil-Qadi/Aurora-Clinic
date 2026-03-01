// Netlify Edge Function — fixes incorrect MIME types for Next.js static assets.
// The @netlify/plugin-nextjs serves CSS chunks as text/plain; this intercepts
// the response at the CDN edge and overrides Content-Type based on extension.

const MIME_MAP: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

export default async (request: Request, context: any) => {
  const response = await context.next();
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Find matching extension
  const ext = pathname.substring(pathname.lastIndexOf("."));
  const correctMime = MIME_MAP[ext];

  if (correctMime) {
    const headers = new Headers(response.headers);
    headers.set("content-type", correctMime);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};

export const config = {
  path: "/_next/static/*",
};
