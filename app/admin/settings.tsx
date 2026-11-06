"use client";
export type SiteSettings = {
  business_name: string;
  operator_name: string;
  contact_email: string;
  contact_phone: string;
  privacy_contact: string;
  privacy_retention_days: number | null;
  cancellation_policy: string;
  check_in: string;
  check_out: string;
  booking_enabled: boolean;
  missing_fields: string[];
  demo_mode: boolean;
};
const fieldLabels: Record<string, string> = {
  operator_name: "Υπεύθυνος εκμετάλλευσης",
  contact_email: "Email επικοινωνίας",
  privacy_contact: "Επικοινωνία απορρήτου",
  privacy_retention_days: "Χρόνος διατήρησης",
  cancellation_policy: "Πολιτική ακυρώσεων",
};
export default function SettingsCenter({
  settings,
  busy,
  save,
  error,
}: {
  settings: SiteSettings;
  busy: boolean;
  save: (input: object) => Promise<boolean>;
  error?: string;
}) {
  return (
    <section className="admin-panel admin-settings">
      <h2>Στοιχεία & όροι διαμονής</h2>
      <p className="admin-help">
        Τα στοιχεία αυτά εμφανίζονται στο site και στη σελίδα του επισκέπτη.
        Συμπληρώστε τα πραγματικά στοιχεία του υπευθύνου και τους όρους που
        εφαρμόζετε. Οι online πληρωμές παραμένουν ανενεργές.
      </p>
      {settings.demo_mode && (
        <p className="admin-alert">
          Δοκιμαστική λειτουργία: χρησιμοποιούνται ενδεικτικά στοιχεία για να
          ελεγχθεί η εφαρμογή. Αποθηκεύστε τα πραγματικά στοιχεία πριν από
          κανονική λειτουργία.
        </p>
      )}
      {!settings.booking_enabled && (
        <p className="form-error" role="status">
          Χρειάζεται συμπλήρωση:{" "}
          {settings.missing_fields
            .map((field) => fieldLabels[field] || field)
            .join(", ")}
          .
        </p>
      )}
      <form
        key={JSON.stringify(settings)}
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await save({
            action: "settings",
            business_name: form.get("business_name"),
            operator_name: form.get("operator_name"),
            contact_email: form.get("contact_email"),
            contact_phone: form.get("contact_phone"),
            privacy_contact: form.get("privacy_contact"),
            privacy_retention_days:
              form.get("privacy_retention_days") === ""
                ? null
                : Number(form.get("privacy_retention_days")),
            cancellation_policy: form.get("cancellation_policy"),
            check_in: form.get("check_in"),
            check_out: form.get("check_out"),
            demo_mode: form.get("demo_mode") === "on",
          });
        }}
      >
        <div className="admin-form-grid">
          <label>
            Εμπορικό όνομα
            <input
              name="business_name"
              defaultValue={settings.business_name}
              maxLength={180}
            />
          </label>
          <label>
            Υπεύθυνος εκμετάλλευσης
            <input
              name="operator_name"
              defaultValue={settings.operator_name}
              maxLength={180}
            />
          </label>
          <label>
            Email επικοινωνίας
            <input
              name="contact_email"
              type="email"
              defaultValue={settings.contact_email}
              maxLength={254}
            />
          </label>
          <label>
            Τηλέφωνο επικοινωνίας
            <input
              name="contact_phone"
              type="tel"
              defaultValue={settings.contact_phone}
              maxLength={40}
            />
          </label>
          <label>
            Email για θέματα απορρήτου
            <input
              name="privacy_contact"
              type="email"
              defaultValue={settings.privacy_contact}
              maxLength={254}
            />
          </label>
          <label>
            Διατήρηση στοιχείων αιτημάτων (ημέρες)
            <input
              name="privacy_retention_days"
              type="number"
              min={1}
              max={3650}
              step={1}
              defaultValue={settings.privacy_retention_days ?? ""}
            />
          </label>
          <label>
            Ώρα άφιξης
            <input
              name="check_in"
              type="time"
              defaultValue={settings.check_in}
            />
          </label>
          <label>
            Ώρα αναχώρησης
            <input
              name="check_out"
              type="time"
              defaultValue={settings.check_out}
            />
          </label>
        </div>
        <label>
          Πολιτική ακυρώσεων & όροι κράτησης
          <textarea
            name="cancellation_policy"
            defaultValue={settings.cancellation_policy}
            maxLength={4000}
            placeholder="Περιγράψτε τους όρους που εφαρμόζετε, χωρίς στοιχεία επισκεπτών."
          />
        </label>
        <label className="admin-checkbox">
          <input
            name="demo_mode"
            type="checkbox"
            defaultChecked={settings.demo_mode}
          />
          Δοκιμαστική λειτουργία
        </label>
        <p className="admin-help">
          Όσο είναι ενεργή, το site δείχνει σαφή ένδειξη δοκιμής. Για
          απενεργοποίηση χρειάζονται πραγματικά στοιχεία επιχείρησης και
          επικοινωνίας.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? "Αποθήκευση…" : "Αποθήκευση ρυθμίσεων"}
        </button>
      </form>
    </section>
  );
}
