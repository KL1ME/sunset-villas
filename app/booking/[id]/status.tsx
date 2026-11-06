"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  Globe,
  LoaderCircle,
  Printer,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import type { PublicSettings } from "@/lib/settings";

type Language = "el" | "en";
type Booking = {
  id: string;
  property_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total: number | null;
  created_at: string;
  updated_at: string | null;
};
type Snapshot = { booking: Booking; settings: PublicSettings };
const copy = {
  el: {
    title: "Η διαμονή σας, με μια ματιά.",
    eyebrow: "ΤΟ ΑΙΤΗΜΑ ΣΑΣ",
    back: "Επιστροφή στο site",
    privateTitle: "Ιδιωτική πρόσβαση",
    privateText:
      "Ανοίξτε τον ιδιωτικό σύνδεσμο που αποθηκεύσατε μετά την αποστολή του αιτήματος ή επικολλήστε τον παρακάτω. Ο κωδικός αιτήματος μόνος του δεν παρέχει πρόσβαση.",
    privateField: "Ιδιωτικός σύνδεσμος ή κλειδί πρόσβασης",
    open: "Άνοιγμα αιτήματος",
    invalidLink:
      "Εισαγάγετε τον πλήρη ιδιωτικό σύνδεσμο αυτού του αιτήματος ή το κλειδί πρόσβασής του.",
    unavailable:
      "Το αίτημα δεν βρέθηκε ή το κλειδί πρόσβασης δεν ισχύει. Ελέγξτε τον ιδιωτικό σύνδεσμό σας.",
    networkError:
      "Η ενημέρωση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.",
    loading: "Φόρτωση αιτήματος…",
    refresh: "Ανανέωση",
    lastChecked: "Τελευταίος έλεγχος",
    saveLink:
      "Φυλάξτε τον ιδιωτικό σύνδεσμό σας. Για την προστασία του, το κλειδί αφαιρέθηκε από τη γραμμή διεύθυνσης και δεν αποθηκεύεται σε αυτή τη συσκευή. Μετά από επαναφόρτωση θα χρειαστεί να ανοίξετε ξανά τον αποθηκευμένο σύνδεσμο.",
    copyLink: "Αντιγραφή ιδιωτικού συνδέσμου",
    copied: "Ο ιδιωτικός σύνδεσμος αντιγράφηκε. Κρατήστε τον μόνο για εσάς.",
    copyError:
      "Δεν ήταν δυνατή η αντιγραφή. Ελέγξτε την άδεια αντιγραφής του browser και δοκιμάστε ξανά.",
    print: "Εκτύπωση σύνοψης",
    useAnother: "Χρήση άλλου ιδιωτικού συνδέσμου",
    reference: "Κωδικός αιτήματος",
    property: "Κατάλυμα",
    checkIn: "Άφιξη",
    checkOut: "Αναχώρηση",
    guests: "Επισκέπτες",
    total: "Συνολική τιμή διαμονής",
    quote: "Η τελική τιμή θα συμφωνηθεί με το κατάλυμα.",
    contact: "Επικοινωνία με το κατάλυμα",
    noContact: "Δεν έχουν δηλωθεί στοιχεία επικοινωνίας.",
    terms: "Όροι διαμονής και ακυρώσεων",
    withdraw: "Απόσυρση αιτήματος",
    withdrawTitle: "Να αποσυρθεί το αίτημα;",
    withdrawText:
      "Το εκκρεμές αίτημά σας θα αποσυρθεί. Για διαφορετική διαμονή μπορείτε να στείλετε νέο αίτημα από το site.",
    withdrawConfirm: "Ναι, απόσυρση",
    keep: "Διατήρηση αιτήματος",
    withdrew: "Το αίτημά σας αποσύρθηκε.",
    changed:
      "Η κατάσταση του αιτήματος άλλαξε. Δείτε την τελευταία ενημέρωση πριν συνεχίσετε.",
    close: "Κλείσιμο",
    demo: "Δοκιμαστική λειτουργία — τα στοιχεία επικοινωνίας είναι προσωρινά. Μη χρησιμοποιείτε πραγματικά προσωπικά στοιχεία. Οι δοκιμαστικές κρατήσεις δεν ισχύουν για διαμονή.",
    demoContact: "Προσωρινά δοκιμαστικά στοιχεία",
    unknown: "Χρειάζεται έλεγχος από το κατάλυμα",
    unknownText:
      "Επικοινωνήστε με το κατάλυμα για την κατάσταση του αιτήματός σας.",
    statuses: {
      requested: [
        "Σε αναμονή",
        "Το αίτημά σας έχει καταχωριστεί. Δεν αποτελεί επιβεβαιωμένη κράτηση και δεν δεσμεύει ημερομηνίες.",
      ],
      held: [
        "Προσωρινή δέσμευση",
        "Υπάρχει προσωρινή δέσμευση ημερομηνιών. Η οριστική επιβεβαίωση της κράτησης εκκρεμεί.",
      ],
      confirmed: [
        "Επιβεβαιωμένη κράτηση",
        "Το κατάλυμα επιβεβαίωσε τη διαμονή σας. Για αλλαγές ή ακύρωση επικοινωνήστε με τον οικοδεσπότη.",
      ],
      cancelled: [
        "Ακυρωμένο αίτημα",
        "Το αίτημα ή η κράτηση έχει ακυρωθεί. Για νέα διαμονή στείλτε νέο αίτημα από το site.",
      ],
      expired: [
        "Έληξε",
        "Η προσωρινή δέσμευση έληξε και δεν αποτελεί επιβεβαιωμένη κράτηση.",
      ],
      completed: [
        "Ολοκληρωμένη διαμονή",
        "Οι ημερομηνίες της επιβεβαιωμένης διαμονής έχουν παρέλθει.",
      ],
      payment_review: [
        "Έλεγχος από το κατάλυμα",
        "Η κράτηση χρειάζεται έλεγχο από τον οικοδεσπότη. Επικοινωνήστε με το κατάλυμα.",
      ],
    },
  },
  en: {
    title: "Your stay at a glance.",
    eyebrow: "YOUR REQUEST",
    back: "Back to the website",
    privateTitle: "Private access",
    privateText:
      "Open the private link you saved after submitting your request, or paste it below. A request reference alone does not provide access.",
    privateField: "Private link or access key",
    open: "Open your request",
    invalidLink:
      "Enter the full private link for this request or its access key.",
    unavailable:
      "The request could not be found or the access key is not valid. Check your private link.",
    networkError:
      "The update could not be completed. Check your connection and try again.",
    loading: "Loading your request…",
    refresh: "Refresh",
    lastChecked: "Last checked",
    saveLink:
      "Keep your private link safe. To protect it, the access key has been removed from the address bar and is not saved on this device. After reloading, you will need to open your saved link again.",
    copyLink: "Copy private link",
    copied: "Your private link has been copied. Keep it to yourself.",
    copyError:
      "The link could not be copied. Check your browser's clipboard permission and try again.",
    print: "Print summary",
    useAnother: "Use another private link",
    reference: "Request reference",
    property: "Property",
    checkIn: "Check-in",
    checkOut: "Check-out",
    guests: "Guests",
    total: "Total stay price",
    quote: "The final price will be agreed with the property.",
    contact: "Contact the property",
    noContact: "Contact details have not been provided.",
    terms: "Stay and cancellation terms",
    withdraw: "Withdraw request",
    withdrawTitle: "Withdraw this request?",
    withdrawText:
      "Your pending request will be withdrawn. You can submit a new request on the website for a different stay.",
    withdrawConfirm: "Yes, withdraw",
    keep: "Keep request",
    withdrew: "Your request has been withdrawn.",
    changed:
      "The request's status has changed. Review the latest update before continuing.",
    close: "Close",
    demo: "Demo mode — contact details are temporary. Do not use real personal information. Test bookings are not valid for a stay.",
    demoContact: "Temporary demo details",
    unknown: "Property review needed",
    unknownText: "Contact the property about your request's status.",
    statuses: {
      requested: [
        "Pending",
        "Your request has been received. It is not a confirmed booking and does not reserve dates.",
      ],
      held: [
        "Temporarily held",
        "The dates are temporarily held. Your booking is awaiting final confirmation.",
      ],
      confirmed: [
        "Confirmed booking",
        "The property has confirmed your stay. Contact the host for changes or cancellation.",
      ],
      cancelled: [
        "Cancelled",
        "The request or booking has been cancelled. Submit a new request on the website for a new stay.",
      ],
      expired: [
        "Expired",
        "The temporary hold expired and is not a confirmed booking.",
      ],
      completed: [
        "Completed stay",
        "The dates of the confirmed stay have passed.",
      ],
      payment_review: [
        "Property review needed",
        "The booking needs review by the host. Please contact the property.",
      ],
    },
  },
};
const validKey = (value: string) => /^[a-f0-9]{64}$/.test(value);

export default function BookingStatus({ id }: { id: string }) {
  const [lang, setLang] = useState<Language>("el");
  const [hasKey, setHasKey] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const keyRef = useRef("");
  const initializedRef = useRef(false);
  const readerRef = useRef<AbortController | null>(null);
  const withdrawingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = copy[lang];
  const booking = snapshot?.booking;
  const settings = snapshot?.settings;
  const endpoint = "/api/bookings/" + encodeURIComponent(id);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let key = "";
    try {
      key = decodeURIComponent(location.hash.slice(1));
    } catch {
      /* Invalid fragments never become credentials. */
    }
    if (location.hash)
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
    if (validKey(key)) {
      keyRef.current = key;
      setHasKey(true);
    }
  }, []);

  const load = useCallback(async () => {
    if (!validKey(keyRef.current) || withdrawingRef.current) return;
    readerRef.current?.abort();
    const controller = new AbortController();
    readerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${keyRef.current}` },
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      if (readerRef.current !== controller) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          setSnapshot(null);
          throw new Error(t.unavailable);
        }
        throw new Error(t.networkError);
      }
      const value = (await response.json()) as Snapshot;
      if (readerRef.current !== controller) return;
      if (!value.booking || value.booking.id !== id || !value.settings)
        throw new Error(t.networkError);
      setSnapshot(value);
      setLastChecked(new Date().toISOString());
    } catch (caught) {
      if (readerRef.current === controller)
        setError(
          caught instanceof Error &&
            caught.name !== "AbortError" &&
            !(caught instanceof TypeError) &&
            !(caught instanceof SyntaxError)
            ? caught.message
            : t.networkError,
        );
    } finally {
      clearTimeout(timeout);
      if (readerRef.current === controller) {
        readerRef.current = null;
        setLoading(false);
      }
    }
  }, [endpoint, id, t.networkError, t.unavailable]);

  useEffect(() => {
    if (!hasKey) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    refreshVisible();
    const interval = setInterval(refreshVisible, 60000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisible);
      readerRef.current?.abort();
      readerRef.current = null;
    };
  }, [hasKey, load]);

  useEffect(() => {
    if (withdrawOpen && booking?.status === "requested") {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      if (withdrawOpen) setWithdrawOpen(false);
    }
  }, [withdrawOpen, booking?.status]);

  function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const value = String(new FormData(form).get("privateLink") || "").trim();
    let key = value;
    if (!validKey(key)) {
      try {
        const url = new URL(value);
        key =
          url.origin === location.origin &&
          url.pathname === "/booking/" + id &&
          !url.search
            ? decodeURIComponent(url.hash.slice(1))
            : "";
      } catch {
        key = "";
      }
    }
    if (!validKey(key)) {
      setError(t.invalidLink);
      return;
    }
    keyRef.current = key;
    setSnapshot(null);
    setNotice("");
    setError("");
    setHasKey(true);
    form.reset();
  }
  async function copyPrivateLink() {
    try {
      const link = new URL("/booking/" + id, location.origin);
      link.hash = keyRef.current;
      await navigator.clipboard.writeText(link.href);
      setNotice(t.copied);
    } catch {
      setNotice(t.copyError);
    }
  }
  async function withdraw() {
    if (withdrawingRef.current || booking?.status !== "requested") return;
    withdrawingRef.current = true;
    setWithdrawing(true);
    setError("");
    readerRef.current?.abort();
    readerRef.current = null;
    setLoading(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyRef.current}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "withdraw" }),
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 409) setNotice(t.changed);
        throw new Error(response.status === 409 ? t.changed : t.networkError);
      }
      setSnapshot((previous) =>
        previous
          ? {
              ...previous,
              booking: { ...previous.booking, status: "cancelled" },
            }
          : previous,
      );
      setWithdrawOpen(false);
      setNotice(t.withdrew);
    } catch (caught) {
      setError(
        caught instanceof Error &&
          caught.name !== "AbortError" &&
          !(caught instanceof TypeError)
          ? caught.message
          : t.networkError,
      );
    } finally {
      clearTimeout(timeout);
      withdrawingRef.current = false;
      setWithdrawing(false);
      // Reload even after a conflict: the host may have confirmed concurrently.
      void load();
    }
  }
  function date(value: string) {
    const parsed = new Date(value + "T12:00:00Z");
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString(lang === "el" ? "el-GR" : "en-GB", {
          timeZone: "Europe/Athens",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  }
  const state = booking
    ? t.statuses[booking.status as keyof typeof t.statuses] || [
        t.unknown,
        t.unknownText,
      ]
    : null;

  return (
    <main className="guest-booking">
      <header className="guest-booking-header">
        <a href="/" className="guest-booking-brand">
          <img src="/photos/logo.jpg" alt="Sunset Luxury Villas" />
          <span>
            SUNSET<small>LUXURY VILLAS</small>
          </span>
        </a>
        <button
          className="text-link guest-no-print"
          onClick={() => setLang(lang === "el" ? "en" : "el")}
          aria-label={
            lang === "el" ? "Switch to English" : "Αλλαγή σε Ελληνικά"
          }
        >
          <Globe size={15} />
          {lang === "el" ? "EN" : "ΕΛ"}
        </button>
      </header>
      <a className="text-link guest-no-print guest-back" href="/">
        <ArrowLeft size={15} />
        {t.back}
      </a>
      <div className="guest-booking-title">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
      </div>
      {settings?.demo_mode && (
        <aside className="guest-demo-warning" role="note">
          <ShieldCheck size={21} />
          <p>{t.demo}</p>
        </aside>
      )}
      {error && (
        <p className="guest-booking-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="guest-booking-notice guest-no-print" role="status">
          {notice}
        </p>
      )}
      {!hasKey ? (
        <section className="guest-booking-card guest-no-print">
          <ShieldCheck size={27} />
          <h2>{t.privateTitle}</h2>
          <p>{t.privateText}</p>
          <form onSubmit={unlock}>
            <label>
              {t.privateField}
              <input
                type="password"
                name="privateLink"
                required
                autoComplete="off"
                maxLength={2500}
                spellCheck={false}
              />
            </label>
            <button className="button" type="submit">
              {t.open}
              <ArrowUpRight size={16} />
            </button>
          </form>
        </section>
      ) : (
        <>
          <div className="guest-booking-toolbar guest-no-print">
            <button
              className="text-link"
              onClick={() => void load()}
              disabled={loading || withdrawing}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              {t.refresh}
            </button>
            {snapshot && (
              <>
                <button
                  className="text-link"
                  onClick={() => void copyPrivateLink()}
                >
                  <Copy size={16} />
                  {t.copyLink}
                </button>
                <button className="text-link" onClick={() => window.print()}>
                  <Printer size={16} />
                  {t.print}
                </button>
              </>
            )}
          </div>
          {loading && !booking && (
            <p className="guest-booking-loading" role="status">
              <LoaderCircle size={20} className="spin" />
              {t.loading}
            </p>
          )}
          {booking && state && (
            <>
              <section
                className={
                  "guest-booking-card guest-state guest-state-" + booking.status
                }
              >
                <div className="guest-state-heading">
                  {booking.status === "confirmed" ||
                  booking.status === "completed" ? (
                    <Check size={25} />
                  ) : (
                    <CalendarDays size={25} />
                  )}
                  <h2>{state[0]}</h2>
                </div>
                <p>{state[1]}</p>
                <dl className="guest-booking-details">
                  <div className="guest-booking-property">
                    <dt>{t.property}</dt>
                    <dd>{booking.property_name}</dd>
                  </div>
                  <div>
                    <dt>{t.checkIn}</dt>
                    <dd>{date(booking.check_in)}</dd>
                  </div>
                  <div>
                    <dt>{t.checkOut}</dt>
                    <dd>{date(booking.check_out)}</dd>
                  </div>
                  <div>
                    <dt>{t.guests}</dt>
                    <dd>{booking.guests}</dd>
                  </div>
                  <div>
                    <dt>{t.total}</dt>
                    <dd>
                      {booking.total === null
                        ? t.quote
                        : new Intl.NumberFormat(
                            lang === "el" ? "el-GR" : "en-GB",
                            { style: "currency", currency: "EUR" },
                          ).format(booking.total / 100)}
                    </dd>
                  </div>
                  <div className="guest-booking-reference">
                    <dt>{t.reference}</dt>
                    <dd>{booking.id}</dd>
                  </div>
                </dl>
                {booking.status === "requested" && (
                  <button
                    className="guest-withdraw text-link guest-no-print"
                    onClick={() => {
                      setError("");
                      setWithdrawOpen(true);
                    }}
                  >
                    {t.withdraw}
                    <X size={16} />
                  </button>
                )}
              </section>
              <p className="guest-private-note guest-no-print">
                <ShieldCheck size={18} />
                {t.saveLink}
              </p>
              {settings && (
                <section className="guest-booking-card guest-contact-card">
                  <h2>{settings.demo_mode ? t.demoContact : t.contact}</h2>
                  {settings.operator_name && <p>{settings.operator_name}</p>}
                  {settings.contact_email &&
                    (settings.demo_mode ? (
                      <p>{settings.contact_email}</p>
                    ) : (
                      <a href={"mailto:" + settings.contact_email}>
                        {settings.contact_email}
                      </a>
                    ))}
                  {settings.contact_phone &&
                    (settings.demo_mode ? (
                      <p>{settings.contact_phone}</p>
                    ) : (
                      <a
                        href={
                          "tel:" + settings.contact_phone.replace(/[^+\d]/g, "")
                        }
                      >
                        {settings.contact_phone}
                      </a>
                    ))}
                  {!settings.contact_email && !settings.contact_phone && (
                    <p>{t.noContact}</p>
                  )}
                  {(settings.cancellation_policy ||
                    settings.check_in ||
                    settings.check_out) && (
                    <details className="guest-stay-terms">
                      <summary>{t.terms}</summary>
                      {settings.cancellation_policy && (
                        <p>{settings.cancellation_policy}</p>
                      )}
                      {settings.check_in && (
                        <p>
                          {t.checkIn}: {settings.check_in}
                        </p>
                      )}
                      {settings.check_out && (
                        <p>
                          {t.checkOut}: {settings.check_out}
                        </p>
                      )}
                    </details>
                  )}
                </section>
              )}
            </>
          )}
          {lastChecked && (
            <p className="guest-last-checked">
              {t.lastChecked}:{" "}
              {new Date(lastChecked).toLocaleString(
                lang === "el" ? "el-GR" : "en-GB",
                {
                  timeZone: "Europe/Athens",
                  dateStyle: "short",
                  timeStyle: "short",
                },
              )}
            </p>
          )}
          {!withdrawing && (
            <button
              className="text-link guest-other-link guest-no-print"
              onClick={() => {
                readerRef.current?.abort();
                readerRef.current = null;
                keyRef.current = "";
                setHasKey(false);
                setSnapshot(null);
                setLastChecked(null);
                setError("");
                setNotice("");
                setLoading(false);
              }}
            >
              {t.useAnother}
            </button>
          )}
        </>
      )}
      <dialog
        ref={dialogRef}
        className="guest-withdraw-dialog"
        aria-label={t.withdrawTitle}
        onCancel={(event) => {
          event.preventDefault();
          if (!withdrawing) setWithdrawOpen(false);
        }}
      >
        <button
          className="icon-button guest-dialog-close"
          aria-label={t.close}
          disabled={withdrawing}
          onClick={() => setWithdrawOpen(false)}
        >
          <X size={20} />
        </button>
        <h2>{t.withdrawTitle}</h2>
        <p>{t.withdrawText}</p>
        {error && (
          <p className="guest-booking-error" role="alert">
            {error}
          </p>
        )}
        <div className="guest-dialog-actions">
          <button
            className="button"
            disabled={withdrawing}
            onClick={() => void withdraw()}
          >
            {withdrawing ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              t.withdrawConfirm
            )}
          </button>
          <button
            className="text-link"
            disabled={withdrawing}
            onClick={() => setWithdrawOpen(false)}
          >
            {t.keep}
          </button>
        </div>
      </dialog>
    </main>
  );
}
