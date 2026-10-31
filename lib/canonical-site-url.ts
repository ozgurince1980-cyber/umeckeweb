/** Resolve the one canonical public app origin for OAuth/Stripe redirects. Never trust the request Origin header. */
export function getCanonicalSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be configured.");
  }

  const parsed = new URL(configured);
  const isLocalHttp =
    parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname);

  if (parsed.protocol !== "https:" && !isLocalHttp) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS except on localhost.");
  }

  if (process.env.NODE_ENV === "production" && parsed.hostname !== "solidareaty.de") {
    throw new Error("Production canonical site URL must be https://solidareaty.de.");
  }

  return parsed.origin;
}
