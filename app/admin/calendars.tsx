"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Copy,
  Plus,
  X,
  Link2,
  ShieldCheck,
} from "lucide-react";
import type { Property } from "@/lib/catalog";
import type { CalendarEntry } from "@/lib/calendar-store";
export type CalendarFeedStatus = {
  id: string;
  property_id: string;
  provider: string;
  last_synced: string | null;
  error: string | null;
  last_attempt: string | null;
  next_sync: string | null;
  failure_count: number;
  event_count: number;
  lock_until: string | null;
};
type Props = {
  token: string;
  properties: (Property & {
    export_token: string;
    internal_code?: string | null;
  })[];
  feeds: CalendarFeedStatus[];
  view: "calendar" | "connections";
  reload: () => Promise<void>;
};
const sourceNames = {
  site: "Site",
  airbnb: "Airbnb",
  booking: "Booking",
  manual: "Κλειστό από εσάς",
};
const displayTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("el-GR", {
        timeZone: "Europe/Athens",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Δεν έχει ολοκληρωθεί";
export default function CalendarCenter({
  token,
  properties,
  feeds,
  view,
  reload,
}: Props) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || ""),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [entries, setEntries] = useState<CalendarEntry[]>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [calendarError, setCalendarError] = useState(""),
    [message, setMessage] = useState(""),
    [dialog, setDialog] = useState<null | "feed" | "block" | CalendarEntry>(
      null,
    ),
    [provider, setProvider] = useState("airbnb"),
    [version, setVersion] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null),
    reloadRef = useRef(reload);
  reloadRef.current = reload;
  const selected = properties.find((p) => p.id === propertyId),
    propertyFeeds = feeds.filter((f) => f.property_id === propertyId);
  useEffect(() => {
    const interval = setInterval(() => void reloadRef.current(), 60000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (dialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialog]);
  useEffect(() => {
    if (
      view !== "calendar" ||
      !propertyId ||
      !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)
    )
      return;
    const controller = new AbortController();
    setLoading(true);
    setEntries([]);
    setCalendarError("");
    fetch("/api/admin/calendar?" + new URLSearchParams({ propertyId, month }), {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          entries: CalendarEntry[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error || "Αποτυχία φόρτωσης ημερολογίου.");
        setEntries(data.entries);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setEntries([]);
          setCalendarError(e instanceof Error ? e.message : "Σφάλμα.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [propertyId, month, token, version, feeds, view]);
  async function perform(input: object) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const value = (await response.json()) as {
        error?: string;
        status?: string;
        results?: { status: string }[];
      };
      if (!response.ok)
        throw new Error(value.error || "Η ενέργεια δεν ολοκληρώθηκε.");
      setDialog(null);
      setMessage(
        value.status === "busy" ||
          value.results?.some((result) => result.status === "busy")
          ? "Ο συγχρονισμός εκτελείται ήδη."
          : "Η ενέργεια ολοκληρώθηκε.",
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Σφάλμα.");
      return false;
    } finally {
      await reload();
      setVersion((v) => v + 1);
      setBusy(false);
    }
  }
  async function copyExport() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(
        location.origin + "/api/calendars/" + selected.export_token + ".ics",
      );
      setMessage(
        "Ο ιδιωτικός σύνδεσμος του site αντιγράφηκε. Εισαγάγετέ τον σε Airbnb και Booking.",
      );
    } catch {
      setError(
        "Δεν ήταν δυνατή η αντιγραφή. Ελέγξτε την άδεια clipboard του browser.",
      );
    }
  }
  const validMonth = /^20\d{2}-(0[1-9]|1[0-2])$/.test(month);
  return (
    <section className="admin-panel calendar-center">
      <div className="admin-panel-title">
        <div>
          <h2>
            {view === "calendar"
              ? "Ένα ημερολόγιο, όλες οι πηγές"
              : "Συνδέσεις ημερολογίων"}
          </h2>
          <p className="admin-help">
            Επιλέξτε το ίδιο πραγματικό σπίτι και στις δύο πλατφόρμες.
          </p>
        </div>
        <div className="admin-filters">
          <label className="sr-label">
            Κατάλυμα
            <select
              aria-label="Κατάλυμα ημερολογίου"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.internal_code ? p.internal_code + " · " : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {view === "calendar" && (
            <label className="sr-label">
              Μήνας
              <input
                aria-label="Μήνας ημερολογίου"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
          )}
        </div>
      </div>
      <div className="calendar-toolbar">
        <button
          className="button small"
          disabled={busy || !propertyFeeds.length}
          onClick={() => void perform({ action: "syncProperty", propertyId })}
        >
          <RefreshCw size={15} className={busy ? "spin" : ""} />
          Συγχρονισμός τώρα
        </button>
        <button
          className="text-link"
          onClick={() => {
            setError("");
            setDialog("block");
          }}
        >
          <Plus size={15} />
          Κλείσιμο ημερομηνιών
        </button>
        <button className="text-link" onClick={() => void copyExport()}>
          <Copy size={14} />
          Αντιγραφή iCal του site
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {calendarError && (
        <p className="form-error" role="alert">
          {calendarError}
        </p>
      )}
      {message && (
        <p className="calendar-message" role="status">
          {message}
        </p>
      )}
      <div className="feed-status-grid">
        {["airbnb", "booking"].map((source) => {
          const feed = propertyFeeds.find((f) => f.provider === source),
            inProgress =
              feed?.lock_until && Date.parse(feed.lock_until) > Date.now(),
            stale =
              feed?.last_synced &&
              Date.now() - Date.parse(feed.last_synced) > 30 * 60000;
          return (
            <article
              className={
                "feed-status-card " + (feed?.error || stale ? "feed-error" : "")
              }
              key={source}
            >
              <div>
                <strong>
                  {source === "airbnb" ? "Airbnb" : "Booking.com"}
                </strong>
                <span className={"source-dot source-" + source} />
              </div>
              <p>
                {!feed
                  ? "Δεν έχει συνδεθεί"
                  : inProgress
                    ? "Γίνεται συγχρονισμός…"
                    : feed.error
                      ? "Χρειάζεται έλεγχος"
                      : stale
                        ? "Η τελευταία ενημέρωση είναι παλιά"
                        : !feed.last_synced
                          ? "Αναμονή πρώτης εισαγωγής"
                          : "Συνδεδεμένο"}
              </p>
              {feed && (
                <>
                  <small>
                    Τελευταία επιτυχία: {displayTime(feed.last_synced)}
                  </small>
                  <small>
                    {feed.event_count} ενεργές δεσμεύσεις · Επόμενος έλεγχος:{" "}
                    {displayTime(feed.next_sync)}
                  </small>
                  {feed.error && (
                    <small className="form-error">{feed.error}</small>
                  )}
                </>
              )}
              <button
                className="admin-action"
                onClick={() => {
                  setProvider(source);
                  setError("");
                  setDialog("feed");
                }}
              >
                {feed ? "Αλλαγή σύνδεσης" : "Σύνδεση iCal"}
                <Link2 size={12} />
              </button>
            </article>
          );
        })}
      </div>
      {view === "calendar" && (
        <>
          <div className="calendar-legend">
            {Object.entries(sourceNames).map(([key, label]) => (
              <span key={key}>
                <i className={"source-dot source-" + key} />
                {label}
              </span>
            ))}
          </div>
          <p className="admin-help">
            Η αναχώρηση δεν δεσμεύεται ως νύχτα. Η διαθεσιμότητα των πλατφορμών
            ενημερώνεται περιοδικά. {loading ? "Φόρτωση…" : ""}
          </p>
          {validMonth && (
            <div className="admin-calendar" aria-busy={loading}>
              {["ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ", "ΚΥΡ"].map((day) => (
                <span className="weekday" key={day}>
                  {day}
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
                    Number(month.slice(5)),
                    0,
                  ).getDate(),
                },
                (_, i) => {
                  const date = month + "-" + String(i + 1).padStart(2, "0"),
                    active = entries.filter(
                      (e) => e.start <= date && e.end > date,
                    );
                  return (
                    <div
                      className={
                        "calendar-day " + (active.length ? "occupied" : "")
                      }
                      key={date}
                    >
                      <span>{i + 1}</span>
                      {active.slice(0, 3).map((e) => (
                        <small
                          title={e.title}
                          className={"calendar-event source-" + e.source}
                          key={e.id}
                        >
                          {sourceNames[e.source]}
                        </small>
                      ))}
                      {active.length > 3 && <small>+{active.length - 3}</small>}
                    </div>
                  );
                },
              )}
            </div>
          )}
          <h3 className="calendar-list-title">Δεσμεύσεις του μήνα</h3>
          {!loading && !entries.length && (
            <p className="admin-help">
              Δεν υπάρχουν καταχωρισμένες δεσμεύσεις για τον μήνα. Ελέγξτε και
              την κατάσταση σύνδεσης παραπάνω.
            </p>
          )}
          <div className="calendar-entry-list">
            {entries.map((e) => (
              <div key={e.id}>
                <span className={"source-dot source-" + e.source} />
                <div>
                  <strong>{e.title}</strong>
                  <small>
                    {e.start} → {e.end} · {sourceNames[e.source]}
                  </small>
                </div>
                {e.source === "manual" && (
                  <button className="admin-action" onClick={() => setDialog(e)}>
                    Άνοιγμα ημερομηνιών
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {view === "connections" && (
        <div className="calendar-setup">
          <h3>Ολοκλήρωση σύνδεσης και προς τις δύο κατευθύνσεις</h3>
          <p>
            Οι δύο εισαγωγές παραπάνω ενημερώνουν το site. Για να ενημερώνονται
            και οι πλατφόρμες, κάντε τις παρακάτω ρυθμίσεις μία φορά στη
            διαχείρισή τους.
          </p>
          <p>
            Αν Airbnb και Booking είναι ήδη συνδεδεμένα μεταξύ τους,
            διατηρήστε αυτές τις συνδέσεις. Προσθέστε μόνο το ημερολόγιο του
            site σε κάθε πλατφόρμα, αφού το backend αποκτήσει δημόσια HTTPS
            διεύθυνση.
          </p>
          <ol>
            <li>
              <strong>Site → Airbnb:</strong> αντιγράψτε το iCal του site και
              προσθέστε το στο Airbnb ως εξωτερικό ημερολόγιο.
            </li>
            <li>
              <strong>Site → Booking:</strong> προσθέστε τον ίδιο σύνδεσμο στη
              λειτουργία εισαγωγής ημερολογίου της Booking.
            </li>
            <li>
              <strong>Booking → Airbnb:</strong> προσθέστε το export iCal της
              Booking στην Airbnb, μόνο αν δεν υπάρχει ήδη η σύνδεση.
            </li>
            <li>
              <strong>Airbnb → Booking:</strong> προσθέστε το export iCal της
              Airbnb στην Booking, μόνο αν δεν υπάρχει ήδη η σύνδεση.
            </li>
          </ol>
          <div className="notice">
            <ShieldCheck size={20} />
            <p>
              Το iCal του site περιλαμβάνει τις δικές σας κρατήσεις και
              χειροκίνητες δεσμεύσεις. Οι εισαγόμενες κρατήσεις δεν
              επανεξάγονται, για να αποφεύγονται κύκλοι που κρατούν ημερομηνίες
              κλειστές μετά από ακύρωση. Τα τέσσερα βήματα των πλατφορμών
              χρειάζονται πραγματικό έλεγχο· η σύνδεση εδώ δεν τα επιβεβαιώνει.
            </p>
          </div>
          <p>
            Το backend ελέγχει τα feeds περίπου ανά 15 λεπτά. Η Airbnb αναφέρει
            ανανέωση ανά 3 ώρες· η Booking ακολουθεί τον δικό της κύκλο. Το iCal
            δεν μεταφέρει τιμές ή όρους κράτησης.
          </p>
          <a
            href="https://www.airbnb.com/help/article/99"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Οδηγίες Airbnb
          </a>
        </div>
      )}
      <dialog
        ref={dialogRef}
        className="admin-calendar-dialog"
        aria-label={
          dialog === "feed"
            ? "Σύνδεση iCal"
            : dialog === "block"
              ? "Κλείσιμο ημερομηνιών"
              : "Άνοιγμα ημερομηνιών"
        }
        onCancel={() => setDialog(null)}
      >
        <button
          className="dialog-close icon-button"
          aria-label="Κλείσιμο"
          onClick={() => setDialog(null)}
        >
          <X size={20} />
        </button>
        {dialog === "feed" ? (
          <>
            <h2>Σύνδεση {provider === "airbnb" ? "Airbnb" : "Booking.com"}</h2>
            <p className="admin-help">
              Στη διαχείριση της πλατφόρμας επιλέξτε εξαγωγή ημερολογίου και
              αντιγράψτε ολόκληρο το ιδιωτικό iCal URL. Ο δημόσιος σύνδεσμος της
              αγγελίας δεν αρκεί.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void perform({
                  action: "feed",
                  propertyId,
                  provider,
                  url: data.get("url"),
                });
              }}
            >
              <label>
                Ιδιωτικό iCal export URL
                <input
                  name="url"
                  type="password"
                  required
                  maxLength={3000}
                  autoComplete="off"
                  placeholder="https://…"
                />
              </label>
              <p className="admin-help">
                Ο σύνδεσμος αποθηκεύεται μόνο στο backend. Δεν εμφανίζεται στο
                δημόσιο site ή στο GitHub.
              </p>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button" disabled={busy}>
                <Link2 size={16} />
                Σύνδεση & πρώτη εισαγωγή
              </button>
            </form>
          </>
        ) : dialog === "block" ? (
          <>
            <h2>Κλείσιμο ημερομηνιών</h2>
            <p className="admin-help">
              Οι επιλεγμένες νύχτες θα κλείσουν στο site και θα μπουν στο iCal
              που διαβάζουν οι πλατφόρμες.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void perform({
                  action: "blockDates",
                  propertyId,
                  start: data.get("start"),
                  end: data.get("end"),
                  note: data.get("note"),
                });
              }}
            >
              <label>
                Πρώτη κλειστή νύχτα
                <input type="date" name="start" required />
              </label>
              <label>
                Ημερομηνία ανοίγματος
                <input type="date" name="end" required />
              </label>
              <label>
                Σημείωση μόνο για εσάς
                <input
                  name="note"
                  maxLength={140}
                  placeholder="π.χ. συντήρηση"
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button" disabled={busy}>
                <CalendarDays size={16} />
                Κλείσιμο ημερομηνιών
              </button>
            </form>
          </>
        ) : dialog && typeof dialog === "object" ? (
          <>
            <h2>Άνοιγμα ημερομηνιών</h2>
            <p>
              {dialog.start} → {dialog.end}
            </p>
            <p className="admin-help">
              Θα αφαιρεθεί μόνο η δική σας χειροκίνητη δέσμευση. Τυχόν κρατήσεις
              από άλλες πηγές παραμένουν.
            </p>
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void perform({ action: "releaseBlock", id: dialog.id })
              }
            >
              Άνοιγμα ημερομηνιών
            </button>
          </>
        ) : null}
      </dialog>
    </section>
  );
}
