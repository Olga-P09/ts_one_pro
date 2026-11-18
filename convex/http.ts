import { httpRouter } from "convex/server";
import { regionsByCountry } from "../assets/demo-regions.js";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const ALLOWED_ORIGINS = new Set([
  "https://discoverthinksmart.com",
  "https://www.discoverthinksmart.com",
  "https://ts-one-pro.kdoan.workers.dev",
  "https://ts-one-pro-demo-form.modest-sternum.workers.dev",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

const REGION_ALIASES = new Map([
  ["washington dc", "dc"],
  ["washington, d.c.", "dc"],
  ["newfoundland", "nl"],
  ["québec", "qc"],
]);

function cors(request: Request) {
  const origin = request.headers.get("Origin");
  return origin && ALLOWED_ORIGINS.has(origin)
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
    : null;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) || undefined : undefined;
}

const http = httpRouter();

http.route({
  path: "/demo-request",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const headers = cors(request);
    if (!headers) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/demo-request",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const headers = cors(request);
    if (!headers) return Response.json({ error: "Origin not allowed" }, { status: 403 });

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Invalid request" }, { status: 400, headers });
    }

    const form = body as Record<string, unknown>;
    if (form.consent !== true && form.consent !== "on" && form.consent !== "true") {
      return Response.json({ error: "Consent is required" }, { status: 400, headers });
    }
    if (text(form.website, 256)) return Response.json({ ok: true }, { headers });

    const firstName = text(form.firstName, 256);
    const lastName = text(form.lastName, 256);
    const email = text(form.email, 254)?.toLowerCase();
    const company = text(form.company, 256);
    const countryValue = text(form.country, 32)?.toLowerCase();
    const countryCode = countryValue === "ca" || countryValue === "canada" ? "CA"
      : countryValue === "us" || countryValue === "united states" ? "US" : undefined;
    const region = text(form.region, 128);
    const normalizedRegion = region?.toLowerCase();
    const regionKey = normalizedRegion && (REGION_ALIASES.get(normalizedRegion) ?? normalizedRegion);
    const match = countryCode && Object.entries(regionsByCountry[countryCode]).find(([code, name]) =>
      code.toLowerCase() === regionKey || name.toLowerCase() === regionKey
    );
    if (!firstName || !lastName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
      || !company || !countryCode || (region && !match)) {
      return Response.json({ error: "Invalid or missing form fields" }, { status: 400, headers });
    }

    try {
      const id = await ctx.runMutation(internal.demoRequests.create, {
        firstName,
        lastName,
        email,
        company,
        phone: text(form.phone, 64),
        jobTitle: text(form.jobTitle, 256),
        country: countryCode === "CA" ? "Canada" : "United States",
        region,
        regionCode: match?.[0],
        consent: true,
        utmSource: text(form.utmSource, 256)?.toLowerCase(),
        utmMedium: text(form.utmMedium, 256)?.toLowerCase(),
        utmCampaign: text(form.utmCampaign, 256),
        utmContent: text(form.utmContent, 256),
        utmTerm: text(form.utmTerm, 256),
        referrer: text(form.referrer, 2048),
        sourceUrl: text(form.sourceUrl, 2048),
        userAgent: text(request.headers.get("User-Agent"), 1024),
      });
      return Response.json({ ok: true, id }, { headers });
    } catch (error) {
      console.error("Could not save demo request", error);
      return Response.json({ error: "Could not save demo request" }, { status: 500, headers });
    }
  }),
});

export default http;
