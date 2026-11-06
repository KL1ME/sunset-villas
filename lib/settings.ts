import { cleanText, emailAddress, Problem } from "./domain.ts";
export type PublicSettings = {
  business_name: string;
  operator_name: string;
  contact_email: string;
  contact_phone: string;
  privacy_contact: string;
  privacy_retention_days: number | null;
  cancellation_policy: string;
  check_in: string;
  check_out: string;
  demo_mode: boolean;
  booking_enabled: boolean;
  missing_fields: string[];
};
const defaults = {
  business_name: "Sunset Luxury Villas",
  operator_name: "ΔΟΚΙΜΑΣΤΙΚΟΣ ΥΠΕΥΘΥΝΟΣ — προσωρινά στοιχεία",
  contact_email: "demo@example.invalid",
  contact_phone: "0000000000",
  privacy_contact: "privacy@example.invalid",
  privacy_retention_days: 7 as number | null,
  cancellation_policy:
    "Δοκιμαστική λειτουργία: τα αιτήματα και οι επιβεβαιώσεις χρησιμοποιούνται μόνο για έλεγχο της εφαρμογής και δεν αποτελούν πραγματικές κρατήσεις διαμονής. Μπορείτε να αποσύρετε εκκρεμές αίτημα από την ιδιωτική σελίδα του.",
  check_in: "",
  check_out: "",
  demo_mode: true,
};
function realModeReady(settings: typeof defaults) {
  return (
    !!settings.operator_name &&
    !/δοκιμασ|προσωριν|demo|placeholder/i.test(settings.operator_name) &&
    !!settings.contact_email &&
    !!settings.privacy_contact &&
    !/\.(invalid|example|test)$/i.test(settings.contact_email) &&
    !/\.(invalid|example|test)$/i.test(settings.privacy_contact) &&
    !!settings.privacy_retention_days &&
    !!settings.cancellation_policy &&
    !/δοκιμασ|demo|placeholder/i.test(settings.cancellation_policy) &&
    (!settings.contact_phone || /[1-9]/.test(settings.contact_phone))
  );
}
function validStoredSettings(value: unknown): value is typeof defaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>,
    keys = Object.keys(defaults);
  if (Object.keys(row).some((key) => !keys.includes(key))) return false;
  for (const key of keys) {
    if (
      key !== "demo_mode" &&
      key !== "privacy_retention_days" &&
      typeof row[key] !== "string"
    )
      return false;
  }
  if (typeof row.demo_mode !== "boolean") return false;
  const days = row.privacy_retention_days;
  if (
    days !== null &&
    (typeof days !== "number" ||
      !Number.isInteger(days) ||
      days < 1 ||
      days > 3650)
  )
    return false;
  try {
    if (row.contact_email) emailAddress(row.contact_email);
    if (row.privacy_contact) emailAddress(row.privacy_contact);
  } catch {
    return false;
  }
  if (
    row.contact_phone &&
    !/^[+\d ()-]{5,40}$/.test(row.contact_phone as string)
  )
    return false;
  return row.demo_mode || realModeReady(value as typeof defaults);
}
const closedSettings = (): PublicSettings => ({
  ...defaults,
  booking_enabled: false,
  missing_fields: ["settings"],
});
export async function publicSettings(db: D1Database): Promise<PublicSettings> {
  const row = await db
    .prepare("SELECT value FROM site_settings WHERE key='public'")
    .first<{ value: string }>();
  let stored: Partial<typeof defaults> = {};
  try {
    if (row) {
      const value: unknown = JSON.parse(row.value);
      if (!validStoredSettings(value)) return closedSettings();
      stored = value;
    }
  } catch {
    /* Keep requests closed when stored configuration is malformed. */
    return closedSettings();
  }
  const settings = { ...defaults, ...stored };
  const missing_fields = [
    "operator_name",
    "contact_email",
    "privacy_contact",
    "privacy_retention_days",
    "cancellation_policy",
  ].filter((key) => !settings[key as keyof typeof settings]);
  return {
    ...settings,
    missing_fields,
    booking_enabled: missing_fields.length === 0,
  };
}
export async function saveSettings(
  db: D1Database,
  input: Record<string, unknown>,
) {
  const text = (key: string, max: number) =>
    input[key] ? cleanText(input[key], max) : "";
  const settings = {
    business_name: text("business_name", 120) || "Sunset Luxury Villas",
    operator_name: text("operator_name", 180),
    contact_email: input.contact_email ? emailAddress(input.contact_email) : "",
    contact_phone: text("contact_phone", 40),
    privacy_contact: input.privacy_contact
      ? emailAddress(input.privacy_contact)
      : "",
    privacy_retention_days:
      input.privacy_retention_days === "" ||
      input.privacy_retention_days == null
        ? null
        : Number(input.privacy_retention_days),
    cancellation_policy: text("cancellation_policy", 5000),
    check_in: text("check_in", 120),
    check_out: text("check_out", 120),
    demo_mode: input.demo_mode !== false,
  };
  if (
    settings.privacy_retention_days !== null &&
    (!Number.isInteger(settings.privacy_retention_days) ||
      settings.privacy_retention_days < 1 ||
      settings.privacy_retention_days > 3650)
  )
    throw new Problem(
      400,
      "Ο χρόνος διατήρησης πρέπει να είναι από 1 έως 3650 ημέρες.",
    );
  if (
    settings.contact_phone &&
    !/^[+\d ()-]{5,40}$/.test(settings.contact_phone)
  )
    throw new Problem(400, "Ελέγξτε το τηλέφωνο επικοινωνίας.");
  if (!settings.demo_mode && !realModeReady(settings))
    throw new Problem(
      400,
      "Πριν ανοίξουν πραγματικά αιτήματα, συμπληρώστε τα πραγματικά στοιχεία υπευθύνου, επικοινωνίας, απορρήτου και πολιτικής ακυρώσεων.",
    );
  await db
    .prepare(
      "INSERT INTO site_settings (key,value) VALUES ('public',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .bind(JSON.stringify(settings))
    .run();
  return publicSettings(db);
}
