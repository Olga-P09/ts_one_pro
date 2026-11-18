import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const optionalText = v.optional(v.string());
const easternDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const create = internalMutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    company: v.string(),
    phone: optionalText,
    jobTitle: optionalText,
    country: v.union(v.literal("United States"), v.literal("Canada")),
    region: v.string(),
    regionCode: v.string(),
    consent: v.literal(true),
    utmSource: optionalText,
    utmMedium: optionalText,
    utmCampaign: optionalText,
    utmContent: optionalText,
    utmTerm: optionalText,
    referrer: optionalText,
    sourceUrl: optionalText,
    userAgent: optionalText,
  },
  handler: async (ctx, request) => {
    const roster = await ctx.db.query("regionReps").collect();
    const countryNames = request.country === "Canada" ? ["canada", "ca"] : ["united states", "us"];
    const reps = roster.find(row =>
      countryNames.includes(row.country.trim().toLowerCase()) && row.regions.includes(request.regionCode)
    );
    const now = new Date();
    const { year, month, day } = Object.fromEntries(
      easternDate.formatToParts(now).map(({ type, value }) => [type, value]),
    );

    // TODO: Email reps once the email service and final rep list are available.
    return await ctx.db.insert("demoRequests", {
      ...request,
      submittedAt: now.toISOString(),
      submittedDate: `${year}-${month}-${day}`,
      status: "new",
      territory: reps?.territory,
      territoryManager: reps?.territoryManager,
      insideSales: reps?.insideSales,
      technicalConsultant: reps?.technicalConsultant,
    });
  },
});
