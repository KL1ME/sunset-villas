"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Search,
  Settings,
} from "lucide-react";
import type { Property } from "@/lib/catalog";
import "./admin.css";
import CalendarCenter, { type CalendarFeedStatus } from "./calendars";
import AdminDialog from "./dialog";
import SettingsCenter, { type SiteSettings } from "./settings";
type Booking = {
  id: string;
  property_id: string;
  property_name: string;
  name: string;
  email: string;
  phone: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total: number | null;
  payment_status: string;
  created_at: string;
  admin_note?: string;
};
type AdminProperty = Property & {
  export_token: string;
  internal_code: string | null;
};
type State = {
  properties: AdminProperty[];
  bookings: Booking[];
  feeds: CalendarFeedStatus[];
  settings: SiteSettings;
  pagination: { page: number; pageSize: number; total: number; pages: number };
  stats: { requested: number; confirmed: number };
  system?: { key: string; value: string }[];
};
type Filters = {
  status: string;
  propertyId: string;
  search: string;
  page: number;
};
type Modal =
  | { kind: "property"; property: Partial<AdminProperty> }
  | { kind: "confirm" | "cancel" | "quote" | "note"; booking: Booking };
const labels: Record<string, string> = {
  requested: "Αναμονή",
  confirmed: "Επιβεβαιωμένη",
  held: "Προσωρινή δέσμευση",
  expired: "Έληξε",
  cancelled: "Ακυρωμένη",
  completed: "Ολοκληρωμένη",
  payment_review: "Χρειάζεται έλεγχο",
};
const money = (n: number | null) =>
  n === null
    ? "Αναμονή προσφοράς"
    : new Intl.NumberFormat("el-GR", {
        style: "currency",
        currency: "EUR",
      }).format(n / 100);
const dateTime = (value: string) =>
  new Date(value).toLocaleString("el-GR", {
    timeZone: "Europe/Athens",
    dateStyle: "short",
    timeStyle: "short",
  });
const initialFilters: Filters = {
  status: "",
  propertyId: "",
  search: "",
  page: 1,
};
export default function Admin() {
  const [token, setToken] = useState(""),
    [logged, setLogged] = useState(false),
    [restoring, setRestoring] = useState(true),
    [data, setData] = useState<State | null>(null),
    [tab, setTab] = useState("bookings"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState<Modal | null>(null),
    [reviewed, setReviewed] = useState(false),
    [filters, setFilters] = useState<Filters>(initialFilters),
    [search, setSearch] = useState(""),
    [statusLink, setStatusLink] = useState<{
      url: string;
      name: string;
    } | null>(null);
  const requestVersion = useRef(0),
    mutation = useRef(false);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...filters,
        page: String(filters.page),
        pageSize: "25",
      });
      const response = await fetch("/api/admin?" + params, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const value = (await response.json()) as State & { error?: string };
      if (version !== requestVersion.current) return;
      if (response.status === 401) {
        setLogged(false);
        setData(null);
        throw new Error("Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.");
      }
      if (!response.ok)
        throw new Error(value.error || "Η διαχείριση δεν φορτώθηκε.");
      setData(value);
    } catch (failure) {
      if (version === requestVersion.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Αποτυχία σύνδεσης. Δοκιμάστε ξανά.",
        );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const session = (await response.json()) as { authenticated?: boolean };
        if (active && response.ok && session.authenticated) setLogged(true);
      })
      .catch(() => {
        if (active)
          setError(
            "Δεν ήταν δυνατός ο έλεγχος σύνδεσης. Μπορείτε να συνδεθείτε ξανά.",
          );
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (logged) void load();
  }, [logged, load]);
  useEffect(() => {
    if (!logged) return;
    const timer = setInterval(() => {
      if (!mutation.current && !document.hidden) void load();
    }, 60000);
    return () => clearInterval(timer);
  }, [logged, load]);
  async function login() {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const value = (await response.json()) as { error?: string; url?: string };
      if (!response.ok) throw new Error(value.error || "Η σύνδεση απέτυχε.");
      setToken("");
      setLogged(true);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Η σύνδεση απέτυχε.",
      );
    } finally {
      setBusy(false);
      mutation.current = false;
    }
  }
  async function logout() {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok)
        throw new Error("Η αποσύνδεση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.");
      ++requestVersion.current;
      setLogged(false);
      setData(null);
      setToken("");
      setModal(null);
      setNotice("");
      setStatusLink(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Η αποσύνδεση απέτυχε.",
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function action(input: object) {
    if (mutation.current) return false;
    mutation.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const value = (await response.json()) as { error?: string; url?: string };
      if (response.status === 401) {
        setLogged(false);
        setData(null);
      }
      if (!response.ok)
        throw new Error(value.error || "Η ενέργεια δεν ολοκληρώθηκε.");
      setNotice("Οι αλλαγές αποθηκεύτηκαν.");
      await load();
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Η ενέργεια δεν ολοκληρώθηκε. Δοκιμάστε ξανά.",
      );
      return false;
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function copyStatus(booking: Booking) {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "statusLink", id: booking.id }),
      });
      const value = (await response.json()) as { error?: string; url?: string };
      if (!response.ok)
        throw new Error(value.error || "Ο σύνδεσμος δεν δημιουργήθηκε.");
      if (typeof value.url !== "string")
        throw new Error("Ο σύνδεσμος επισκέπτη δεν δημιουργήθηκε.");
      const url = new URL(value.url, location.origin);
      if (
        url.origin !== location.origin ||
        !url.pathname.startsWith("/booking/") ||
        !url.hash
      )
        throw new Error("Μη έγκυρος σύνδεσμος επισκέπτη.");
      setStatusLink({ url: url.href, name: booking.name });
      try {
        await navigator.clipboard.writeText(url.href);
        setNotice(
          "Ο ιδιωτικός σύνδεσμος κατάστασης αντιγράφηκε. Μοιραστείτε τον μόνο με τον συγκεκριμένο επισκέπτη.",
        );
      } catch {
        setNotice(
          "Ο σύνδεσμος δημιουργήθηκε. Μπορείτε να τον αντιγράψετε από το πεδίο παρακάτω.",
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Η αντιγραφή απέτυχε. Ελέγξτε την άδεια clipboard.",
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function openModal(value: Modal) {
    setError("");
    setNotice("");
    setReviewed(false);
    setModal(value);
  }
  if (restoring)
    return (
      <main className="admin-login" aria-busy="true">
        <p>Έλεγχος σύνδεσης…</p>
      </main>
    );
  if (!logged)
    return (
      <main className="admin-login">
        <a className="text-link" href="/">
          <ArrowLeft size={15} />
          Επιστροφή στο site
        </a>
        <img src="/photos/logo.jpg" alt="Sunset Luxury Villas" />
        <p className="eyebrow">ΔΙΑΧΕΙΡΙΣΗ ΚΑΤΑΛΥΜΑΤΩΝ</p>
        <h1>Καλώς ήρθατε.</h1>
        <p>
          Συνδεθείτε με το ιδιωτικό κλειδί διαχείρισης. Η συνεδρία αποθηκεύεται
          σε ασφαλές cookie και λήγει αυτόματα.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void login();
          }}
        >
          <label>
            Κλειδί διαχείρισης
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              minLength={32}
              autoComplete="off"
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Σύνδεση…" : "Είσοδος"}
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
  if (!data)
    return (
      <main className="admin-login" aria-busy={loading}>
        <p>Φόρτωση διαχείρισης…</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button"
          disabled={loading}
          onClick={() => {
            setError("");
            void load();
          }}
        >
          Δοκιμή ξανά
        </button>
      </main>
    );
  const pagination = data.pagination,
    bookingModal = modal && modal.kind !== "property" ? modal.booking : null;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-wordmark">
          Sunset<small>LUXURY VILLAS</small>
        </a>
        <span className="admin-sidebar-label">ΔΙΑΧΕΙΡΙΣΗ</span>
        {[
          ["bookings", "Κρατήσεις", CalendarDays],
          ["calendar", "Ημερολόγιο", CalendarDays],
          ["properties", "Καταλύματα", Home],
          ["connections", "Συνδέσεις", Link2],
          ["settings", "Ρυθμίσεις", Settings],
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
          <button disabled={busy} onClick={() => void logout()}>
            <LogOut size={15} />
            Αποσύνδεση
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">SUNSET · ΔΙΑΧΕΙΡΙΣΗ ΚΑΤΑΛΥΜΑΤΩΝ</p>
            <h1>
              {
                {
                  bookings: "Οι κρατήσεις σας",
                  properties: "Τα καταλύματά σας",
                  calendar: "Μια ματιά στον μήνα",
                  connections: "Συνδέσεις ημερολογίων",
                  settings: "Ρυθμίσεις επιχείρησης",
                }[tab]
              }
            </h1>
          </div>
          <div className="admin-header-actions">
            <button
              className="text-link"
              disabled={busy || loading}
              onClick={() => {
                setError("");
                void load();
              }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              Ανανέωση
            </button>
            <button
              className="admin-mobile-logout text-link"
              disabled={busy}
              onClick={() => void logout()}
            >
              <LogOut size={15} />
              Αποσύνδεση
            </button>
          </div>
        </header>
        {error && (
          <p className="admin-alert form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="admin-alert" role="status">
            {notice}
          </p>
        )}
        {statusLink && (
          <div className="admin-alert admin-status-link">
            <label>
              Ιδιωτικός σύνδεσμος για {statusLink.name}
              <input
                readOnly
                value={statusLink.url}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <a
              href={statusLink.url}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Προβολή σελίδας επισκέπτη
            </a>
            <button className="text-link" onClick={() => setStatusLink(null)}>
              Απόκρυψη
            </button>
          </div>
        )}
        {data.settings.demo_mode && (
          <p className="admin-alert demo-alert" role="status">
            Δοκιμαστική λειτουργία · Τα στοιχεία επιχείρησης είναι ενδεικτικά.
            Οι online πληρωμές είναι ανενεργές.
          </p>
        )}
        {(tab === "calendar" || tab === "connections") && (
          <p className="admin-help">
            Αυτόματος έλεγχος ανά 15 λεπτά · Τελευταίος κύκλος:{" "}
            {data.system?.find((item) => item.key === "last_calendar_sync")
              ?.value
              ? dateTime(
                  data.system.find((item) => item.key === "last_calendar_sync")!
                    .value,
                )
              : "Δεν έχει εκτελεστεί ακόμη"}
            . Ελέγξτε παρακάτω την κατάσταση κάθε πηγής.
          </p>
        )}
        {!data.settings.booking_enabled && (
          <div className="admin-alert setup-alert">
            <strong>
              Η φόρμα αιτημάτων περιμένει τη συμπλήρωση των στοιχείων
              επιχείρησης.
            </strong>
            <p>
              Οι κρατήσεις ενεργοποιούνται αφού οριστούν τα στοιχεία υπευθύνου,
              η επικοινωνία, η ενημέρωση απορρήτου και η πολιτική ακυρώσεων.
            </p>
            <button className="text-link" onClick={() => setTab("settings")}>
              Συμπλήρωση ρυθμίσεων
            </button>
          </div>
        )}
        <div className="admin-stats">
          <div>
            <span>ΚΑΤΑΛΥΜΑΤΑ</span>
            <strong>{data.properties.length}</strong>
            <small>
              {data.properties.filter((p) => p.published).length} δημοσιευμένα
            </small>
          </div>
          <div>
            <span>ΝΕΑ ΑΙΤΗΜΑΤΑ</span>
            <strong>{data.stats.requested}</strong>
            <small>Σε όλα τα καταλύματα</small>
          </div>
          <div>
            <span>ΕΠΙΒΕΒΑΙΩΜΕΝΕΣ</span>
            <strong>{data.stats.confirmed}</strong>
            <small>Σε όλα τα καταλύματα</small>
          </div>
        </div>
        {tab === "bookings" && (
          <section className="admin-panel" aria-busy={loading}>
            <h2>Αιτήματα & κρατήσεις</h2>
            <p className="admin-help">
              Τα αιτήματα δεν δεσμεύουν ημερομηνίες. Ελέγξτε Airbnb / Booking
              και συμφωνήστε την τελική τιμή πριν από κάθε επιβεβαίωση.
            </p>
            <form
              className="admin-booking-filters"
              onSubmit={(event) => {
                event.preventDefault();
                setFilters((current) => ({
                  ...current,
                  search: search.trim(),
                  page: 1,
                }));
              }}
            >
              <label>
                Κατάσταση
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value,
                      page: 1,
                    }))
                  }
                >
                  <option value="">Όλες</option>
                  {Object.entries(labels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Κατάλυμα
                <select
                  value={filters.propertyId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      propertyId: event.target.value,
                      page: 1,
                    }))
                  }
                >
                  <option value="">Όλα τα καταλύματα</option>
                  {data.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.internal_code ? p.internal_code + " · " : ""}
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-search">
                Αναζήτηση
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  maxLength={120}
                  placeholder="Όνομα, email ή κωδικός κράτησης"
                />
              </label>
              <button className="button small" disabled={loading}>
                <Search size={15} />
                Αναζήτηση
              </button>
              {(filters.status || filters.propertyId || filters.search) && (
                <button
                  className="text-link"
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilters(initialFilters);
                  }}
                >
                  Καθαρισμός
                </button>
              )}
            </form>
            {!data.bookings.length ? (
              <div className="admin-empty">
                <CalendarDays size={31} />
                <h3>Δεν βρέθηκαν αιτήματα.</h3>
                <p>
                  {filters.status || filters.propertyId || filters.search
                    ? "Δοκιμάστε διαφορετικά φίλτρα."
                    : "Τα αιτήματα του site θα εμφανίζονται εδώ."}
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Επισκέπτης</th>
                      <th>Κατάλυμα / Διαμονή</th>
                      <th>Συμφωνημένο ποσό</th>
                      <th>Κατάσταση</th>
                      <th>Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <strong>{booking.name}</strong>
                          <small>
                            <a href={"mailto:" + booking.email}>
                              {booking.email}
                            </a>
                          </small>
                          {booking.phone && (
                            <small>
                              <a href={"tel:" + booking.phone}>
                                {booking.phone}
                              </a>
                            </small>
                          )}
                          <small>{dateTime(booking.created_at)}</small>
                          <small className="admin-booking-id">
                            {booking.id}
                          </small>
                        </td>
                        <td>
                          {booking.property_name}
                          <small>
                            {booking.check_in} → {booking.check_out}
                          </small>
                          <small>{booking.guests} επισκέπτες</small>
                          {booking.admin_note && (
                            <small className="admin-note">
                              {booking.admin_note}
                            </small>
                          )}
                        </td>
                        <td>
                          {money(booking.total)}
                          {booking.status === "requested" && (
                            <button
                              className="admin-action"
                              disabled={busy}
                              onClick={() =>
                                openModal({ kind: "quote", booking })
                              }
                            >
                              {booking.total === null
                                ? "Ορισμός τιμής"
                                : "Αλλαγή τιμής"}
                            </button>
                          )}
                        </td>
                        <td>
                          <span className={"status status-" + booking.status}>
                            {labels[booking.status] || booking.status}
                          </span>
                        </td>
                        <td>
                          {booking.status === "requested" && (
                            <button
                              className="admin-action"
                              disabled={busy}
                              onClick={() =>
                                openModal({ kind: "confirm", booking })
                              }
                            >
                              Έλεγχος & επιβεβαίωση
                            </button>
                          )}
                          <button
                            className="admin-action"
                            disabled={busy}
                            onClick={() => openModal({ kind: "note", booking })}
                          >
                            Σημείωση
                          </button>
                          <button
                            className="admin-action"
                            disabled={busy}
                            onClick={() => void copyStatus(booking)}
                          >
                            Αντιγραφή συνδέσμου επισκέπτη
                          </button>
                          {!["cancelled", "expired"].includes(booking.status) &&
                            booking.payment_status !== "paid" && (
                              <button
                                className="admin-action danger"
                                disabled={busy}
                                onClick={() =>
                                  openModal({ kind: "cancel", booking })
                                }
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
            <nav className="admin-pagination" aria-label="Σελίδες κρατήσεων">
              <span>
                {pagination.total} αποτελέσματα · Σελίδα {pagination.page} από{" "}
                {Math.max(1, pagination.pages)}
              </span>
              <div>
                <button
                  className="text-link"
                  disabled={loading || pagination.page <= 1}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: Math.max(1, current.page - 1),
                    }))
                  }
                >
                  Προηγούμενη
                </button>
                <button
                  className="text-link"
                  disabled={loading || pagination.page >= pagination.pages}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                >
                  Επόμενη
                </button>
              </div>
            </nav>
          </section>
        )}
        {tab === "properties" && (
          <section className="admin-panel">
            <div className="admin-panel-title">
              <h2>Η συλλογή σας</h2>
              <button
                className="button small"
                disabled={busy}
                onClick={() =>
                  openModal({
                    kind: "property",
                    property: {
                      max_guests: 6,
                      bedrooms: 2,
                      min_nights: 1,
                      base_price: null,
                      cleaning_fee: 0,
                      published: 0,
                    },
                  })
                }
              >
                <Plus size={16} />
                Νέο κατάλυμα
              </button>
            </div>
            <div className="admin-properties">
              {data.properties.map((property) => (
                <article key={property.id}>
                  {property.image ? (
                    <img src={property.image} alt={property.name} />
                  ) : (
                    <div className="property-no-photo">
                      <Home size={35} />
                    </div>
                  )}
                  <div>
                    <span className="eyebrow">
                      {property.internal_code
                        ? property.internal_code + " · "
                        : ""}
                      {property.published ? "ΔΗΜΟΣΙΕΥΜΕΝΟ" : "ΠΡΟΣΧΕΔΙΟ"}
                    </span>
                    <h3>{property.name}</h3>
                    <p>{property.location}</p>
                    <p>
                      {property.max_guests} επισκέπτες · {property.bedrooms}{" "}
                      υπνοδωμάτια · {money(property.base_price)} / νύχτα
                    </p>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() => openModal({ kind: "property", property })}
                    >
                      Επεξεργασία
                      <ArrowLeft size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {(tab === "calendar" || tab === "connections") && (
          <CalendarCenter
            properties={data.properties}
            feeds={data.feeds}
            view={tab}
            reload={load}
          />
        )}
        {tab === "settings" && (
          <SettingsCenter
            settings={data.settings}
            busy={busy}
            save={action}
            error={error}
          />
        )}
      </main>
      {modal && (
        <AdminDialog
          title={
            modal.kind === "property"
              ? modal.property.id
                ? "Επεξεργασία καταλύματος"
                : "Νέο κατάλυμα"
              : modal.kind === "confirm"
                ? "Έλεγχος κράτησης"
                : modal.kind === "cancel"
                  ? "Ακύρωση κράτησης"
                  : modal.kind === "quote"
                    ? "Συμφωνημένη τιμή"
                    : "Ιδιωτική σημείωση"
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          {modal.kind === "property" ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                if (
                  await action({
                    action: "property",
                    id: modal.property.id,
                    name: form.get("name"),
                    location: form.get("location"),
                    description: form.get("description"),
                    maxGuests: form.get("maxGuests"),
                    bedrooms: form.get("bedrooms"),
                    minNights: form.get("minNights"),
                    basePrice: form.get("basePrice"),
                    cleaningFee: form.get("cleaningFee"),
                    image: form.get("image"),
                    published: form.get("published") === "on",
                  })
                )
                  setModal(null);
              }}
            >
              <label>
                Όνομα
                <input
                  name="name"
                  defaultValue={modal.property.name}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Τοποθεσία
                <input
                  name="location"
                  defaultValue={modal.property.location || ""}
                  required
                  maxLength={180}
                />
              </label>
              <label>
                Περιγραφή
                <textarea
                  name="description"
                  defaultValue={modal.property.description}
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
                    defaultValue={modal.property.max_guests}
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
                    defaultValue={modal.property.bedrooms}
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
                    defaultValue={modal.property.min_nights}
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
                      modal.property.base_price == null
                        ? ""
                        : modal.property.base_price / 100
                    }
                    min={1}
                    max={10000}
                  />
                </label>
                <label>
                  Καθαρισμός (€)
                  <input
                    type="number"
                    name="cleaningFee"
                    step="0.01"
                    defaultValue={(modal.property.cleaning_fee || 0) / 100}
                    min={0}
                    max={1000}
                  />
                </label>
              </div>
              <label>
                Φωτογραφία (HTTPS URL ή /photos/…)
                <input
                  name="image"
                  defaultValue={modal.property.image || ""}
                  maxLength={2000}
                />
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={!!modal.property.published}
                />
                Δημοσίευση στη συλλογή
              </label>
              <p className="admin-help">
                Αφήστε την τιμή κενή αν θέλετε να δίνετε εξατομικευμένη
                προσφορά. Οι νέες κρατήσεις χρησιμοποιούν τις νέες ρυθμίσεις· οι
                παλιές διατηρούν το συμφωνημένο ποσό.
              </p>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button" disabled={busy}>
                {busy ? "Αποθήκευση…" : "Αποθήκευση"}
                <Check size={16} />
              </button>
            </form>
          ) : (
            bookingModal && (
              <>
                <p>
                  {bookingModal.name} · {bookingModal.property_name}
                </p>
                <p>
                  {bookingModal.check_in} → {bookingModal.check_out} ·{" "}
                  {money(bookingModal.total)}
                </p>
                {modal.kind === "quote" ? (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      if (
                        await action({
                          action: "quote",
                          id: bookingModal.id,
                          total: form.get("total"),
                        })
                      )
                        setModal(null);
                    }}
                  >
                    <label>
                      Συνολικό συμφωνημένο ποσό (€)
                      <input
                        type="number"
                        name="total"
                        min={1}
                        max={1000000}
                        step="0.01"
                        defaultValue={
                          bookingModal.total === null
                            ? ""
                            : bookingModal.total / 100
                        }
                        required
                      />
                    </label>
                    <p className="admin-help">
                      Περιλαμβάνει το σύνολο της διαμονής και τυχόν καθαρισμό. Η
                      αποθήκευση τιμής δεν επιβεβαιώνει την κράτηση και δεν
                      χρεώνει τον επισκέπτη.
                    </p>
                    {error && (
                      <p className="form-error" role="alert">
                        {error}
                      </p>
                    )}
                    <button className="button" disabled={busy}>
                      Αποθήκευση τιμής
                    </button>
                  </form>
                ) : modal.kind === "note" ? (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      if (
                        await action({
                          action: "note",
                          id: bookingModal.id,
                          note: form.get("note"),
                        })
                      )
                        setModal(null);
                    }}
                  >
                    <label>
                      Σημείωση μόνο για τη διαχείριση
                      <textarea
                        name="note"
                        defaultValue={bookingModal.admin_note || ""}
                        maxLength={2000}
                      />
                    </label>
                    <p className="admin-help">
                      Δεν εμφανίζεται στον επισκέπτη ή στα εξαγόμενα ημερολόγια.
                    </p>
                    {error && (
                      <p className="form-error" role="alert">
                        {error}
                      </p>
                    )}
                    <button className="button" disabled={busy}>
                      Αποθήκευση σημείωσης
                    </button>
                  </form>
                ) : modal.kind === "confirm" ? (
                  <>
                    {bookingModal.total === null ? (
                      <p className="form-error">
                        Ορίστε πρώτα τη συμφωνημένη τιμή από το αίτημα.
                      </p>
                    ) : (
                      <label className="admin-checkbox">
                        <input
                          type="checkbox"
                          checked={reviewed}
                          onChange={(event) =>
                            setReviewed(event.target.checked)
                          }
                        />
                        Έλεγξα τη διαθεσιμότητα σε Airbnb και Booking και
                        συμφώνησα την τιμή με τον επισκέπτη.
                      </label>
                    )}
                    <p className="admin-help">
                      Η επιβεβαίωση δεσμεύει τις νύχτες στο site και στο
                      εξαγόμενο iCal. Δεν πραγματοποιείται online πληρωμή.
                    </p>
                    {error && (
                      <p className="form-error" role="alert">
                        {error}
                      </p>
                    )}
                    <div className="admin-modal-buttons">
                      <button
                        className="button"
                        disabled={
                          busy || !reviewed || bookingModal.total === null
                        }
                        onClick={async () => {
                          if (
                            await action({
                              action: "confirm",
                              id: bookingModal.id,
                              calendarReviewed: reviewed,
                              expectedTotal: bookingModal.total,
                            })
                          )
                            setModal(null);
                        }}
                      >
                        Επιβεβαίωση κράτησης
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Θα ακυρωθεί μόνο αυτή η κράτηση και θα αφαιρεθούν οι δικές
                      της δεσμεύσεις. Οι κρατήσεις άλλων πηγών παραμένουν.
                    </p>
                    {error && (
                      <p className="form-error" role="alert">
                        {error}
                      </p>
                    )}
                    <div className="admin-modal-buttons">
                      <button
                        className="button"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            await action({
                              action: "cancel",
                              id: bookingModal.id,
                            })
                          )
                            setModal(null);
                        }}
                      >
                        Ακύρωση κράτησης
                      </button>
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() => setModal(null)}
                      >
                        Επιστροφή
                      </button>
                    </div>
                  </>
                )}
              </>
            )
          )}
        </AdminDialog>
      )}
    </div>
  );
}
