import { regionsByCountry } from "./demo-regions.js";

const endpoint = "https://tangible-flamingo-743.convex.site/demo-request";
const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const storageKey = "ts_utms";

function captureUtms() {
  const params = new URLSearchParams(window.location.search);
  const current = Object.fromEntries(
    utmKeys.filter(key => params.get(key)).map(key => [key, params.get(key)]),
  );
  try {
    if (Object.keys(current).length) {
      current.referrer = document.referrer;
      window.sessionStorage.setItem(storageKey, JSON.stringify(current));
      return current;
    }
    const stored = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "{}");
    return Object.fromEntries(
      [...utmKeys, "referrer"]
        .filter(key => typeof stored?.[key] === "string")
        .map(key => [key, stored[key]]),
    );
  } catch {
    return current;
  }
}

const utms = captureUtms();
const form = document.getElementById("demoForm");
const country = form.elements.namedItem("country");
const region = form.elements.namedItem("region");
const consent = form.elements.namedItem("consent");
const error = document.getElementById("formError");
const button = document.getElementById("submitBtn");
const buttonLabel = button.textContent;
const fields = form.querySelectorAll(".field input, .field select");

function fillRegions() {
  const canada = country.value === "CA";
  const names = Object.values(regionsByCountry[country.value] ?? {});
  document.getElementById("stLabel").firstChild.textContent = canada ? "Province / territory " : "State ";
  document.getElementById("stMsg").textContent = canada
    ? "Please choose your province or territory."
    : "Please choose your state.";
  region.replaceChildren(new Option("Select…", ""), ...names.map(name => new Option(name, name)));
  region.closest(".field").classList.remove("invalid");
}

country.addEventListener("change", fillRegions);
fillRegions();

function check(field) {
  const value = field.value.trim();
  const valid = field.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) : Boolean(value);
  field.closest(".field").classList.toggle("invalid", !valid);
  return valid;
}

for (const field of fields) {
  field.addEventListener("blur", () => { if (field.value) check(field); });
  field.addEventListener("input", () => {
    if (field.closest(".field").classList.contains("invalid")) check(field);
  });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (button.disabled || form.style.display === "none") return;
  error.classList.remove("show");
  const invalidFields = [...fields].filter(field => !check(field));
  document.getElementById("consentWrap").classList.toggle("invalid", !consent.checked);
  if (!consent.checked) invalidFields.push(consent);
  if (invalidFields.length) {
    invalidFields[0].focus();
    return;
  }

  const fieldsAsText = Object.fromEntries(
    Array.from(new FormData(form), ([name, value]) => [name, value.trim()]),
  );
  button.disabled = true;
  button.textContent = "Sending…";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...fieldsAsText,
        consent: consent.checked,
        utmSource: utms.utm_source,
        utmMedium: utms.utm_medium,
        utmCampaign: utms.utm_campaign,
        utmContent: utms.utm_content,
        utmTerm: utms.utm_term,
        referrer: utms.referrer || document.referrer,
        sourceUrl: window.location.href,
      }),
    });
    if (!response.ok || !(await response.json()).ok) throw new Error("Demo request failed");
  } catch {
    error.classList.add("show");
    return;
  } finally {
    button.disabled = false;
    button.textContent = buttonLabel;
  }

  document.getElementById("sName").textContent = fieldsAsText.firstName;
  document.getElementById("sRegion").textContent = fieldsAsText.region;
  form.style.display = "none";
  document.getElementById("success").style.display = "block";
  (window.dataLayer ??= []).push({ event: "demo_form_submit", utm_content: utms.utm_content || "direct" });
});
