"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Check,
  CalendarDays,
  Home,
  Link2,
  LogOut,
  ShieldCheck,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";
import type { Property } from "@/lib/catalog";
import "./admin.css";
type Booking = {
  id: string;
  property_id: string;
  property_name: string;
  name: string;
  email: string;
  phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total: number | null;
  payment_status: string;
};
type Feed = {
  id: string;
  property_id: string;
  provider: string;
  last_synced: string | null;
  error: string | null;
};
type AdminProperty = Property & { export_token: string };
type State = {
  properties: AdminProperty[];
  bookings: Booking[];
  feeds: Feed[];
  payments: string;
};
const labels: Record<string, string> = {
  requested: "Αναμονή",
  confirmed: "Επιβεβαιωμένη",
  held: "Προσωρινή δέσμευση",
  expired: "Έληξε",
  cancelled: "Ακυρωμένη",
  payment_review: "Έλεγχος πληρωμής",
};
const money = (n: number | null) =>
  n === null
    ? "Χωρίς τιμή"
    : new Intl.NumberFormat("el-GR", {
        style: "currency",
        currency: "EUR",
      }).format(n / 100);
export default function Admin() {
  const [token, setToken] = useState(""),
    [logged, setLogged] = useState(false),
    [data, setData] = useState<State | null>(null),
    [tab, setTab] = useState("bookings"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Partial<AdminProperty> | null>(null),
    [feedForm, setFeedForm] = useState(false),
    [confirming, setConfirming] = useState<Booking | null>(null),
    [canceling, setCanceling] = useState<Booking | null>(null),
    [reviewed, setReviewed] = useState(false),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [calendarProperty, setCalendarProperty] = useState("");
  async function load(access = token) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${access}` },
      });
      const d = (await r.json()) as State & { error?: string };
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setLogged(true);
      setCalendarProperty((v) => v || d.properties[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }
  async function action(input: object, endpoint = "/api/admin") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const d = (await r.json()) as { error?: string; url?: string };
      if (!r.ok) throw new Error(d.error);
      if (d.url) {
        setNotice("Το δοκιμαστικό checkout δημιουργήθηκε.");
        await navigator.clipboard.writeText(d.url);
        setNotice("Ο σύνδεσμος δοκιμαστικής πληρωμής αντιγράφηκε.");
      }
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Σφάλμα");
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!logged)
    return (
      <main className="admin-login">
        <a className="text-link" href="/">
          <ArrowLeft size={15} />
          Επιστροφή στη βίλα
        </a>
        <img src="/photos/logo.jpg" alt="Sunset Luxury Villas" />
        <p className="eyebrow">ΔΙΑΧΕΙΡΙΣΗ ΚΑΤΑΛΥΜΑΤΩΝ</p>
        <h1>Καλώς ήρθατε.</h1>
        <p>
          Το κλειδί διαχείρισης ορίζεται στο backend και παραμένει στη μνήμη
          μόνο όσο είναι ανοιχτή η σελίδα.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label>
            Κλειδί διαχείρισης
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              minLength={32}
              autoComplete="off"
            />
          </label>
          <button className="button" disabled={busy}>
            Είσοδος
            <ShieldCheck size={17} />
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </main>
    );
  const active = data!.bookings.filter((b) => b.status === "confirmed"),
    pending = data!.bookings.filter((b) => b.status === "requested");
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-wordmark">
          Sunset<small>LUXURY VILLAS</small>
        </a>
        <span className="admin-sidebar-label">WORKSPACE</span>
        {[
          ["bookings", "Κρατήσεις", CalendarDays],
          ["calendar", "Ημερολόγιο", CalendarDays],
          ["properties", "Καταλύματα", Home],
          ["connections", "Συνδέσεις", Link2],
        ].map(([key, label, Icon]) => {
          const I = Icon as typeof Home;
          return (
            <button
              className={tab === key ? "active" : ""}
              key={key as string}
              onClick={() => setTab(key as string)}
            >
              <I size={17} />
              {label as string}
            </button>
          );
        })}
        <div className="admin-sidebar-bottom">
          <a href="/">
            <ArrowLeft size={15} />
            Επιστροφή στο site
          </a>
          <button
            onClick={() => {
              setLogged(false);
              setToken("");
              setData(null);
            }}
          >
            <LogOut size={15} />
            Αποσύνδεση
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">SUNSET · PROPERTY MANAGEMENT</p>
            <h1>
              {
                {
                  bookings: "Οι κρατήσεις σας",
                  properties: "Τα καταλύματά σας",
                  calendar: "Μια ματιά στον μήνα",
                  connections: "Όλα συνδεδεμένα",
                }[tab]
              }
            </h1>
          </div>
          <button
            className="text-link"
            disabled={busy}
            onClick={() => void load()}
          >
            <RefreshCw size={15} className={busy ? "spin" : ""} />
            Ανανέωση
          </button>
        </header>
        {error && (
          <p className="admin-alert form-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="admin-alert">{notice}</p>}
        <div className="admin-stats">
          <div>
            <span>ΚΑΤΑΛΥΜΑΤΑ</span>
            <strong>{data!.properties.length}</strong>
            <small>
              {data!.properties.filter((p) => p.published).length} δημοσιευμένα
            </small>
          </div>
          <div>
            <span>ΝΕΑ ΑΙΤΗΜΑΤΑ</span>
            <strong>{pending.length}</strong>
            <small>Χρειάζονται έλεγχο διαθεσιμότητας</small>
          </div>
          <div>
            <span>ΕΠΙΒΕΒΑΙΩΜΕΝΕΣ</span>
            <strong>{active.length}</strong>
            <small>
              {money(
                active
                  .filter((b) => b.payment_status === "paid")
                  .reduce((sum, b) => sum + (b.total || 0), 0),
              )}{" "}
              πληρωμένα
            </small>
          </div>
        </div>
        {tab === "bookings" && (
          <section className="admin-panel">
            <h2>Αιτήματα & κρατήσεις</h2>
            <p className="admin-help">
              Τα αιτήματα δεν δεσμεύουν ημερομηνίες. Ελέγξτε Airbnb / Booking
              πριν από κάθε επιβεβαίωση.
            </p>
            {!data!.bookings.length ? (
              <div className="admin-empty">
                <CalendarDays size={31} />
                <h3>Χώρος για την επόμενη άφιξη.</h3>
                <p>Τα αιτήματα του site θα εμφανίζονται εδώ.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Επισκέπτης</th>
                      <th>Κατάλυμα / Διαμονή</th>
                      <th>Ποσό</th>
                      <th>Κατάσταση</th>
                      <th>Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.bookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.name}</strong>
                          <small>{b.email}</small>
                          <small>{b.phone}</small>
                        </td>
                        <td>
                          {b.property_name}
                          <small>
                            {b.check_in} → {b.check_out}
                          </small>
                          <small>{b.guests} επισκέπτες</small>
                        </td>
                        <td>
                          {money(b.total)}
                          <small>
                            {b.payment_status === "paid"
                              ? "Πληρωμένη"
                              : "Χωρίς πληρωμή"}
                          </small>
                        </td>
                        <td>
                          <span className={"status status-" + b.status}>
                            {labels[b.status] || b.status}
                          </span>
                        </td>
                        <td>
                          {b.status === "requested" && (
                            <button
                              className="admin-action"
                              onClick={() => {
                                setConfirming(b);
                                setReviewed(false);
                              }}
                            >
                              Έλεγχος & επιβεβαίωση
                            </button>
                          )}
                          {!["cancelled", "expired"].includes(b.status) &&
                            b.payment_status !== "paid" && (
                              <button
                                className="admin-action danger"
                                onClick={() => setCanceling(b)}
                              >
                                Ακύρωση
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
        {tab === "properties" && (
          <section className="admin-panel">
            <div className="admin-panel-title">
              <h2>Η συλλογή σας</h2>
              <button
                className="button small"
                onClick={() =>
                  setEditing({
                    max_guests: 6,
                    bedrooms: 2,
                    min_nights: 1,
                    base_price: null,
                    cleaning_fee: 0,
                    published: 0,
                  })
                }
              >
                <Plus size={16} />
                Νέο κατάλυμα
              </button>
            </div>
            <div className="admin-properties">
              {data!.properties.map((p) => (
                <article key={p.id}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} />
                  ) : (
                    <div className="property-no-photo">
                      <Home size={35} />
                    </div>
                  )}
                  <div>
                    <span className="eyebrow">
                      {p.published ? "ΔΗΜΟΣΙΕΥΜΕΝΟ" : "ΠΡΟΣΧΕΔΙΟ"}
                    </span>
                    <h3>{p.name}</h3>
                    <p>{p.location}</p>
                    <p>
                      {p.max_guests} επισκέπτες · {p.bedrooms} υπνοδωμάτια ·{" "}
                      {money(p.base_price)} / νύχτα
                    </p>
                    <button className="text-link" onClick={() => setEditing(p)}>
                      Επεξεργασία
                      <ArrowLeft size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {tab === "calendar" && (
          <section className="admin-panel">
            <div className="admin-panel-title">
              <h2>Δεσμευμένες νύχτες</h2>
              <div className="admin-filters">
                <select
                  value={calendarProperty}
                  onChange={(e) => setCalendarProperty(e.target.value)}
                >
                  {data!.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
            </div>
            <p className="admin-help">
              Οι επιβεβαιωμένες και προσωρινές δεσμεύσεις του site. Οι
              εισαγόμενες δεσμεύσεις ελέγχονται επιπλέον στο API διαθεσιμότητας.
            </p>
            <div className="admin-calendar">
              {["ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ", "ΚΥΡ"].map((d) => (
                <span className="weekday" key={d}>
                  {d}
                </span>
              ))}
              {Array.from(
                { length: (new Date(month + "-01T12:00:00").getDay() + 6) % 7 },
                (_, i) => (
                  <div className="calendar-blank" key={"blank" + i} />
                ),
              )}
              {Array.from(
                {
                  length: new Date(
                    Number(month.slice(0, 4)),
                    Number(month.slice(5, 7)),
                    0,
                  ).getDate(),
                },
                (_, i) => {
                  const day = month + "-" + String(i + 1).padStart(2, "0"),
                    bookings = data!.bookings.filter(
                      (b) =>
                        b.property_id === calendarProperty &&
                        ["confirmed", "held"].includes(b.status) &&
                        b.check_in <= day &&
                        b.check_out > day,
                    );
                  return (
                    <div
                      className={
                        bookings.length
                          ? "calendar-day occupied"
                          : "calendar-day"
                      }
                      key={day}
                    >
                      <span>{i + 1}</span>
                      {bookings.map((b) => (
                        <small key={b.id}>{b.name}</small>
                      ))}
                    </div>
                  );
                },
              )}
            </div>
          </section>
        )}
        {tab === "connections" && (
          <section className="admin-panel">
            <div className="admin-panel-title">
              <h2>Ημερολόγια & πληρωμές</h2>
              <button
                className="button small"
                onClick={() => setFeedForm(true)}
              >
                <Plus size={15} />
                Σύνδεση iCal
              </button>
            </div>
            <div className="notice">
              <ShieldCheck size={21} />
              <p>
                Το iCal ενημερώνει δεσμευμένες ημερομηνίες με καθυστέρηση. Δεν
                συγχρονίζει τιμές. Για εμπορική λειτουργία με άμεση επιβεβαίωση
                χρειάζεται εγκεκριμένος channel manager.
              </p>
            </div>
            {data!.properties.map((p) => (
              <div className="connection-property" key={p.id}>
                <h3>{p.name}</h3>
                {["airbnb", "booking"].map((provider) => {
                  const f = data!.feeds.find(
                    (f) => f.provider === provider && f.property_id === p.id,
                  );
                  return (
                    <div className="connection-row" key={provider}>
                      <strong>
                        {provider === "airbnb" ? "Airbnb" : "Booking.com"}
                      </strong>
                      <span>
                        {!f
                          ? "Δεν έχει συνδεθεί"
                          : f.error
                            ? "Σφάλμα συγχρονισμού"
                            : f.last_synced
                              ? "Τελευταία ενημέρωση: " +
                                new Date(f.last_synced).toLocaleString("el-GR")
                              : "Αναμονή συγχρονισμού"}
                      </span>
                      {f && (
                        <button
                          className="admin-action"
                          disabled={busy}
                          onClick={() =>
                            void action({ action: "sync", id: f.id })
                          }
                        >
                          Συγχρονισμός
                        </button>
                      )}
                      {f?.error && (
                        <small className="form-error">{f.error}</small>
                      )}
                    </div>
                  );
                })}
                <button
                  className="text-link"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      location.origin + "/api/calendars/" + p.export_token,
                    );
                    setNotice(
                      "Αντιγράφηκε το μυστικό iCal export URL. Χρησιμοποιήστε το μόνο στις πλατφόρμες σας.",
                    );
                  }}
                >
                  <Copy size={14} />
                  Αντιγραφή iCal του site
                </button>
              </div>
            ))}
            <div className="connection-property">
              <h3>Stripe Checkout</h3>
              <p>
                {data!.payments === "test"
                  ? "Συνδεδεμένη σε δοκιμαστική λειτουργία."
                  : "Δεν έχει συνδεθεί. Απαιτούνται test secret key και webhook secret στο backend."}
              </p>
              <p className="admin-help">
                Η έκδοση δέχεται μόνο δοκιμαστικά κλειδιά. Η επιβεβαίωση
                πληρωμής γίνεται μέσω υπογεγραμμένου webhook.
              </p>
            </div>
          </section>
        )}
      </main>
      {editing && (
        <div className="admin-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Επεξεργασία καταλύματος"
            className="admin-modal"
          >
            <button
              className="dialog-close icon-button"
              aria-label="Κλείσιμο"
              onClick={() => setEditing(null)}
            >
              <X size={20} />
            </button>
            <h2>
              {editing.id ? "Επεξεργασία καταλύματος" : "Το επόμενο κατάλυμα"}
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await action({
                    action: "property",
                    id: editing.id,
                    name: f.get("name"),
                    location: f.get("location"),
                    description: f.get("description"),
                    maxGuests: f.get("maxGuests"),
                    bedrooms: f.get("bedrooms"),
                    minNights: f.get("minNights"),
                    basePrice: f.get("basePrice"),
                    cleaningFee: f.get("cleaningFee"),
                    image: f.get("image"),
                    published: f.get("published") === "on",
                  })
                )
                  setEditing(null);
              }}
            >
              <label>
                Όνομα
                <input
                  name="name"
                  defaultValue={editing.name}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Τοποθεσία
                <input
                  name="location"
                  defaultValue={editing.location || "Ακριτοχώρι, Μεσσηνία"}
                  required
                />
              </label>
              <label>
                Περιγραφή
                <textarea
                  name="description"
                  defaultValue={editing.description}
                  required
                  maxLength={1500}
                />
              </label>
              <div className="admin-form-grid">
                <label>
                  Επισκέπτες
                  <input
                    type="number"
                    name="maxGuests"
                    defaultValue={editing.max_guests}
                    min={1}
                    max={30}
                    required
                  />
                </label>
                <label>
                  Υπνοδωμάτια
                  <input
                    type="number"
                    name="bedrooms"
                    defaultValue={editing.bedrooms}
                    min={1}
                    max={20}
                    required
                  />
                </label>
                <label>
                  Ελάχιστες νύχτες
                  <input
                    type="number"
                    name="minNights"
                    defaultValue={editing.min_nights}
                    min={1}
                    max={60}
                    required
                  />
                </label>
                <label>
                  Βασική τιμή / νύχτα (€)
                  <input
                    type="number"
                    name="basePrice"
                    step="0.01"
                    defaultValue={
                      editing.base_price !== null &&
                      editing.base_price !== undefined
                        ? editing.base_price / 100
                        : ""
                    }
                    min={1}
                  />
                </label>
                <label>
                  Καθαρισμός (€)
                  <input
                    type="number"
                    name="cleaningFee"
                    step="0.01"
                    defaultValue={(editing.cleaning_fee || 0) / 100}
                    min={0}
                  />
                </label>
              </div>
              <label>
                Φωτογραφία (HTTPS URL ή /photos/...)
                <input name="image" defaultValue={editing.image || ""} />
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={!!editing.published}
                />
                Δημοσίευση στη συλλογή
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="button" disabled={busy}>
                Αποθήκευση
                <Check size={16} />
              </button>
            </form>
          </section>
        </div>
      )}
      {feedForm && (
        <div className="admin-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Σύνδεση ημερολογίου"
            className="admin-modal"
          >
            <button
              className="dialog-close icon-button"
              aria-label="Κλείσιμο"
              onClick={() => setFeedForm(false)}
            >
              <X />
            </button>
            <h2>Σύνδεση ημερολογίου</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await action({
                    action: "feed",
                    propertyId: f.get("propertyId"),
                    provider: f.get("provider"),
                    url: f.get("url"),
                  })
                )
                  setFeedForm(false);
              }}
            >
              <label>
                Κατάλυμα
                <select name="propertyId">
                  {data!.properties.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Πλατφόρμα
                <select name="provider">
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking.com</option>
                </select>
              </label>
              <label>
                Μυστικό iCal export URL
                <input
                  type="url"
                  name="url"
                  required
                  placeholder="https://..."
                />
              </label>
              <p>
                Από το extranet της πλατφόρμας: εξαγωγή ημερολογίου. Ο σύνδεσμος
                αποθηκεύεται μόνο στο backend.
              </p>
              {error && <p className="form-error">{error}</p>}
              <button className="button" disabled={busy}>
                Σύνδεση & εισαγωγή
                <RefreshCw size={16} />
              </button>
            </form>
          </section>
        </div>
      )}
      {confirming && (
        <div className="admin-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Επιβεβαίωση κράτησης"
            className="admin-modal"
          >
            <button
              className="dialog-close icon-button"
              aria-label="Κλείσιμο"
              onClick={() => setConfirming(null)}
            >
              <X />
            </button>
            <h2>Έλεγχος κράτησης</h2>
            <p>
              {confirming.name} · {confirming.property_name}
            </p>
            <p>
              {confirming.check_in} → {confirming.check_out} ·{" "}
              {money(confirming.total)}
            </p>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              Έλεγξα τη διαθεσιμότητα σε Airbnb και Booking και συμφώνησα την
              τιμή με τον επισκέπτη.
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="admin-modal-buttons">
              <button
                disabled={!reviewed || busy}
                className="button"
                onClick={async () => {
                  if (
                    await action({
                      action: "confirm",
                      id: confirming.id,
                      calendarReviewed: reviewed,
                    })
                  )
                    setConfirming(null);
                }}
              >
                Επιβεβαίωση χωρίς online πληρωμή
              </button>
              <button
                disabled={
                  !reviewed ||
                  busy ||
                  data!.payments !== "test" ||
                  confirming.total === null
                }
                className="text-link"
                onClick={async () => {
                  if (
                    await action(
                      { id: confirming.id, calendarReviewed: reviewed },
                      "/api/checkout",
                    )
                  )
                    setConfirming(null);
                }}
              >
                Δημιουργία δοκιμαστικού checkout
                <ExternalLink size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
      {canceling && (
        <div className="admin-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Ακύρωση κράτησης"
            className="admin-modal"
          >
            <h2>Ακύρωση αιτήματος</h2>
            <p>
              {canceling.name} · {canceling.check_in} → {canceling.check_out}.
              Οι δεσμεύσεις αυτού του αιτήματος θα αφαιρεθούν.
            </p>
            <div className="admin-modal-buttons">
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  if (await action({ action: "cancel", id: canceling.id }))
                    setCanceling(null);
                }}
              >
                Ακύρωση αιτήματος
              </button>
              <button className="text-link" onClick={() => setCanceling(null)}>
                Επιστροφή
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
