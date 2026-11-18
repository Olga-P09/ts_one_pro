import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const person = v.object({ name: v.string(), email: v.string() });

export default defineSchema({
  demoRequests: defineTable({
    // What the visitor typed
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    company: v.string(),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    country: v.string(), // "United States" | "Canada"
    region: v.optional(v.string()), // state/province as sent by the form
    regionCode: v.optional(v.string()), // normalised 2-letter code, e.g. "TX"
    consent: v.boolean(),

    // Sign-up date (Convex also keeps _creationTime automatically)
    submittedAt: v.string(), // ISO timestamp, UTC
    submittedDate: v.string(), // "YYYY-MM-DD" in US Eastern time, easy to filter/export

    // Who owns this lead (copied from regionReps at submit time)
    territory: v.optional(v.string()), // "West" | "Central" | "East" | "Canada"
    territoryManager: v.optional(person),
    insideSales: v.optional(person),
    technicalConsultant: v.optional(person),

    // Which LinkedIn post (or other source) brought them here
    utmSource: v.optional(v.string()), // "linkedin"
    utmMedium: v.optional(v.string()), // "social"
    utmCampaign: v.optional(v.string()), // "ts-one-pro-fy27q3"
    utmContent: v.optional(v.string()), // "post-1" ... "post-6"
    utmTerm: v.optional(v.string()),
    referrer: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    status: v.string(), // "new" | "contacted" | ...
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_territory", ["territory"])
    .index("by_submittedDate", ["submittedDate"])
    .index("by_utmContent", ["utmContent"]),

  // One row per territory (from the Smart Office Territory Map).
  regionReps: defineTable({
    territory: v.string(),
    country: v.string(),
    regions: v.array(v.string()), // 2-letter state/province codes
    territoryManager: v.optional(person), // empty = open seat
    insideSales: v.optional(person),
    technicalConsultant: v.optional(person),
    ccEmails: v.array(v.string()), // Michael Montemayor on every lead
  }).index("by_territory", ["territory"]),
});
