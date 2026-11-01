"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Sun,
  CalendarDays,
  Users,
  Menu,
  X,
  Waves,
  BedDouble,
  Wifi,
  Car,
  Utensils,
  Snowflake,
  ChevronDown,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  Maximize,
  Globe,
  Mountain,
  LoaderCircle,
} from "lucide-react";
import { villa, listingUrl, type Property } from "../../lib/catalog";

type Language = "el" | "en";
const copy = {
  el: {
    nav: ["Η βίλα", "Η εμπειρία", "Φωτογραφίες", "Η τοποθεσία"],
    book: "Η διαμονή σας",
    eyebrow: "ΑΚΡΙΤΟΧΩΡΙ · ΜΕΣΣΗΝΙΑ",
    hero: (
      <>
        Λίγο πιο κοντά
        <br />
        στο <em>ηλιοβασίλεμα.</em>
      </>
    ),
    sub: "Ο δικός σας ορίζοντας. Η δική σας ηρεμία.",
    explore: "Ανακαλύψτε τη βίλα",
    arrival: "ΑΦΙΞΗ",
    departure: "ΑΝΑΧΩΡΗΣΗ",
    guests: "ΕΠΙΣΚΕΠΤΕΣ",
    choose: "Επιλέξτε ημερομηνία",
    people: "επισκέπτες",
    search: "Σχεδιάστε τη διαμονή",
    introLabel: "ΚΑΛΩΣ ΗΡΘΑΤΕ ΣΤΟ SUNSET",
    intro: (
      <>
        Ένα σπίτι.
        <br />
        Χίλιες μικρές <em>στιγμές.</em>
      </>
    ),
    introText:
      "Ψηλά στους ελαιώνες του Ακριτοχωρίου, με τη θάλασσα να απλώνεται μπροστά σας. Ένα πρωινό στη βεράντα, μια βουτιά στην ιδιωτική πισίνα, ένα ηλιοβασίλεμα που δεν βιάζεστε να τελειώσει.",
    details: "Γνωρίστε τον χώρο",
    villaLabel: "Η ΔΙΚΗ ΣΑΣ ΑΠΟΔΡΑΣΗ",
    villaTitle: (
      <>
        Η πολυτέλεια του
        <br />
        <em>να νιώθετε σπίτι.</em>
      </>
    ),
    villaText:
      "Φως, φυσικά υλικά και χώροι που σας αφήνουν να αναπνεύσετε. Η Sunset Luxury Villa συνδυάζει τη ζεστασιά ενός σπιτιού με την ανεμπόδιστη θέα στο μεσσηνιακό τοπίο.",
    upTo: "Έως",
    bedrooms: "υπνοδωμάτια",
    privatePool: "Ιδιωτική πισίνα",
    seaView: "Θέα στη θάλασσα",
    kitchen: "Πλήρης κουζίνα",
    parking: "Ιδιωτικό parking",
    ac: "Κλιματισμός",
    viewPhotos: "Δείτε τις φωτογραφίες",
    experience: "Ο ΡΥΘΜΟΣ ΤΟΥ ΚΑΛΟΚΑΙΡΙΟΥ",
    experienceTitle: (
      <>
        Εδώ, οι καλύτερες στιγμές
        <br />
        δεν χρειάζονται <em>πρόγραμμα.</em>
      </>
    ),
    poolTitle: "Μια βουτιά στον ορίζοντα",
    poolText: "Η πισίνα γίνεται ένα με το γαλάζιο. Και εσείς, με τη στιγμή.",
    insideTitle: "Ο χώρος σας, το καταφύγιό σας",
    insideText: "Ήσυχα πρωινά και απογεύματα με ανοιχτές μπαλκονόπορτες.",
    sunsetTitle: "Η χρυσή ώρα ανήκει σε εσάς",
    sunsetText: "Μείνετε λίγο ακόμα. Η θέα γίνεται πιο όμορφη κάθε λεπτό.",
    gallery: "ΜΙΑ ΜΑΤΙΑ ΣΤΟ SUNSET",
    galleryTitle: (
      <>
        Εικόνες από την επόμενη
        <br />
        <em>όμορφη ανάμνησή σας.</em>
      </>
    ),
    all: "Όλες οι φωτογραφίες",
    location: "ΑΝΑΚΑΛΥΨΤΕ ΤΗ ΜΕΣΣΗΝΙΑ",
    locationTitle: (
      <>
        Ένας τόπος για
        <br />
        να <em>επιστρέφετε.</em>
      </>
    ),
    locationText:
      "Ανάμεσα σε ελαιώνες και τη θάλασσα, το Ακριτοχώρι είναι η αφετηρία για να γνωρίσετε τη Φοινικούντα και τις ακτές της Μεσσηνίας. Εξερευνήστε την περιοχή με τον δικό σας ρυθμό.",
    finikounta: "Φοινικούντα",
    loutsa: "Παραλία Λούτσα",
    mavrovouni: "Παραλία Μαυροβούνι",
    map: "Η περιοχή στον χάρτη",
    ctaLabel: "Η ΕΠΟΜΕΝΗ ΣΑΣ ΑΠΟΔΡΑΣΗ",
    cta: (
      <>
        Κρατήστε λίγο χρόνο
        <br />
        για το <em>δικό σας ηλιοβασίλεμα.</em>
      </>
    ),
    ctaButton: "Σχεδιάστε τη διαμονή σας",
    footer: "Ιδιωτικές στιγμές. Ανοιχτοί ορίζοντες.",
    preview: "ΠΡΟΕΠΙΣΚΟΠΗΣΗ ΣΧΕΔΙΑΣΜΟΥ",
    previewText: "Η σελίδα δεν δέχεται κρατήσεις ή πληρωμές.",
    modalTitle: "Η απόδρασή σας ξεκινά εδώ.",
    modalText:
      "Επιλέξτε τις ημερομηνίες σας για να δείτε πώς θα λειτουργεί η διαδικασία κράτησης.",
    previewInfo:
      "Αυτή είναι δοκιμή σχεδιασμού. Η διαθεσιμότητα και οι τιμές δεν είναι ακόμη συνδεδεμένες με Airbnb / Booking. Δεν δημιουργείται κράτηση.",
    continue: "Προεπισκόπηση αιτήματος",
    request: "Αίτημα κράτησης",
    requestHint:
      "Το αίτημα θα σταλεί στον οικοδεσπότη για επιβεβαίωση διαθεσιμότητας και τελικής τιμής.",
    notActive:
      "Η αποστολή αιτημάτων δεν έχει ενεργοποιηθεί στην προεπισκόπηση.",
    back: "Αλλαγή ημερομηνιών",
    close: "Κλείσιμο",
    privacy: "Απόρρητο",
    privacyText:
      "Η προεπισκόπηση δεν συλλέγει στοιχεία επισκεπτών, δεν χρησιμοποιεί analytics και δεν αποθηκεύει κρατήσεις. Η φιλοξενία παρέχεται από το GitHub Pages. Η πολιτική του GitHub ισχύει για τα τεχνικά δεδομένα που καταγράφει η πλατφόρμα. Πριν από την κανονική λειτουργία θα προστεθούν τα στοιχεία της επιχείρησης και πλήρης πολιτική απορρήτου.",
    selectError: "Επιλέξτε έγκυρη άφιξη και αναχώρηση (έως 60 νύχτες).",
    night: "διανυκτερεύσεις",
    rate: "Τελική τιμή μετά την επιβεβαίωση",
    moreHomes: "Τα καταλύματά μας",
    loading: "Έλεγχος διαθεσιμότητας…",
    unavailable: "Οι ημερομηνίες έχουν δεσμευτεί. Επιλέξτε άλλες.",
    name: "Ονοματεπώνυμο",
    email: "Email",
    phone: "Τηλέφωνο (προαιρετικό)",
    consent: "Έχω διαβάσει την ενημέρωση απορρήτου.",
    send: "Αποστολή αιτήματος",
    sent: "Το αίτημά σας καταχωρίστηκε.",
    sentText:
      "Δεν αποτελεί επιβεβαιωμένη κράτηση. Κρατήστε τον κωδικό για επικοινωνία με τον οικοδεσπότη.",
  },
  en: {
    nav: ["The villa", "The experience", "Gallery", "The location"],
    book: "Your stay",
    eyebrow: "AKRITOCHORI · MESSINIA",
    hero: (
      <>
        A little closer
        <br />
        to the <em>sunset.</em>
      </>
    ),
    sub: "Your own horizon. Your own kind of quiet.",
    explore: "Discover the villa",
    arrival: "CHECK-IN",
    departure: "CHECK-OUT",
    guests: "GUESTS",
    choose: "Select a date",
    people: "guests",
    search: "Plan your stay",
    introLabel: "WELCOME TO SUNSET",
    intro: (
      <>
        One home.
        <br />A thousand little <em>moments.</em>
      </>
    ),
    introText:
      "Above the olive groves of Akritochori, with the sea stretching out before you. Breakfast on the terrace, a dip in your private pool, a sunset you never want to end.",
    details: "Explore your space",
    villaLabel: "YOUR PRIVATE ESCAPE",
    villaTitle: (
      <>
        The luxury of
        <br />
        <em>feeling at home.</em>
      </>
    ),
    villaText:
      "Light, natural materials and room to breathe. Sunset Luxury Villa brings the warmth of a home together with an uninterrupted view of the Messinian landscape.",
    upTo: "Up to",
    bedrooms: "bedrooms",
    privatePool: "Private pool",
    seaView: "Sea view",
    kitchen: "Equipped kitchen",
    parking: "Private parking",
    ac: "Air conditioning",
    viewPhotos: "Explore the gallery",
    experience: "THE RHYTHM OF SUMMER",
    experienceTitle: (
      <>
        Here, the best moments
        <br />
        need no <em>itinerary.</em>
      </>
    ),
    poolTitle: "A dip into the horizon",
    poolText: "The pool meets the blue. And you meet the moment.",
    insideTitle: "Your space, your sanctuary",
    insideText: "Slow mornings and afternoons with the terrace doors open.",
    sunsetTitle: "Your very own golden hour",
    sunsetText: "Stay a little longer. The view gets better by the minute.",
    gallery: "A GLIMPSE OF SUNSET",
    galleryTitle: (
      <>
        A first look at your next
        <br />
        <em>beautiful memory.</em>
      </>
    ),
    all: "All photographs",
    location: "DISCOVER MESSINIA",
    locationTitle: (
      <>
        A place to
        <br />
        <em>come back to.</em>
      </>
    ),
    locationText:
      "Between olive groves and the sea, Akritochori is your starting point for discovering Finikounta and the Messinian coast. Explore at your own pace.",
    finikounta: "Finikounta",
    loutsa: "Loutsa beach",
    mavrovouni: "Mavrovouni beach",
    map: "Explore the area",
    ctaLabel: "YOUR NEXT ESCAPE",
    cta: (
      <>
        Make a little time
        <br />
        for <em>your own sunset.</em>
      </>
    ),
    ctaButton: "Plan your stay",
    footer: "Private moments. Open horizons.",
    preview: "DESIGN PREVIEW",
    previewText: "Bookings and payments are not active on this page.",
    modalTitle: "Your escape begins here.",
    modalText: "Choose your dates to preview the booking experience.",
    previewInfo:
      "This is a design preview. Rates and availability are not connected to Airbnb / Booking yet. No reservation is created.",
    continue: "Preview your request",
    request: "Booking request",
    requestHint:
      "Your request will be sent to the host to confirm availability and the final rate.",
    notActive: "Sending requests is not enabled in this preview.",
    back: "Change dates",
    close: "Close",
    privacy: "Privacy",
    privacyText:
      "This preview collects no guest details, uses no analytics and stores no reservations. It is hosted on GitHub Pages. GitHub’s privacy policy applies to technical data logged by its platform. Business details and a complete privacy policy will be added before launch.",
    selectError: "Choose valid arrival and departure dates (up to 60 nights).",
    night: "nights",
    rate: "Final rate after confirmation",
    moreHomes: "Our stays",
    loading: "Checking availability…",
    unavailable: "These dates are blocked. Please choose different dates.",
    name: "Full name",
    email: "Email",
    phone: "Phone (optional)",
    consent: "I have read the privacy notice.",
    send: "Send request",
    sent: "Your request has been received.",
    sentText:
      "This is not a confirmed reservation. Keep your reference for communication with the host.",
  },
};
const photoNames = [
  "thea19.jpg",
  "spiti1.jpg",
  "eswteriko1.jpg",
  "dwmatiomegalo1.jpg",
  "thea11.jpg",
  "thea18.jpg",
  "eswteriko2.jpg",
  "dwmatio-mikro1.jpg",
  "kouzina1.jpg",
  "thea6.jpg",
  "thea13.jpg",
  "epipleon1.jpg",
  "thea8.jpg",
  "dwmtiomegalo2.jpg",
  "thea20.jpg",
  "mpaniomegalo1.jpg",
  "thea1.jpg",
  "thea12.jpg",
  "thea16.jpg",
  "thea7.jpg",
  "thea17.jpg",
  "thea9.jpg",
  "thea14.jpg",
  "thea15.jpg",
  "thea10.jpg",
  "thea2.jpg",
  "thea3.jpg",
  "thea4.jpg",
  "thea5.jpg",
  "ekswteriki1.jpg",
  "eswteriko3.jpg",
  "eswteriki4.jpg",
  "eswteriki5.jpg",
  "dwmatiomikro2.jpg",
];
function localToday() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
export default function App({
  preview = false,
  initialProperties = [villa],
}: {
  preview?: boolean;
  initialProperties?: Property[];
}) {
  const [lang, setLang] = useState<Language>("el"),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState<null | "booking" | "gallery" | "privacy">(
      null,
    ),
    [photo, setPhoto] = useState(0),
    [checkIn, setCheckIn] = useState(""),
    [checkOut, setCheckOut] = useState(""),
    [guests, setGuests] = useState(2),
    [propertyId, setPropertyId] = useState(
      initialProperties[0]?.id || villa.id,
    ),
    [step, setStep] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{ id: string } | null>(null),
    [total, setTotal] = useState<number | null>(null);
  const t = copy[lang],
    selected = initialProperties.find((p) => p.id === propertyId) || villa,
    dialogRef = useRef<HTMLDialogElement>(null),
    previousFocus = useRef<HTMLElement | null>(null);
  const base = preview ? "/sunset-villas/" : "/";
  const asset = (name: string) => base + "photos/" + name;
  const close = () => {
    setModal(null);
    setError("");
    setStep(1);
    setResult(null);
  };
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (modal) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialogRef.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialogRef.current?.close();
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);
  const openBooking = () => {
    setError("");
    setStep(1);
    setResult(null);
    setModal("booking");
  };
  const nights =
    checkIn && checkOut
      ? Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000)
      : 0;
  async function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fields = new FormData(event.currentTarget),
      arrival = String(fields.get("checkIn") || ""),
      departure = String(fields.get("checkOut") || ""),
      count = Math.round(
        (Date.parse(departure) - Date.parse(arrival)) / 86400000,
      );
    setCheckIn(arrival);
    setCheckOut(departure);
    if (
      !arrival ||
      !departure ||
      arrival < localToday() ||
      !Number.isFinite(count) ||
      count < selected.min_nights ||
      count > 60
    ) {
      setError(t.selectError);
      return;
    }
    if (preview) {
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/availability?${new URLSearchParams({ propertyId, checkIn: arrival, checkOut: departure, guests: String(guests) })}`,
      );
      const value = (await response.json()) as {
        error?: string;
        available: boolean;
        total: number | null;
      };
      if (!response.ok) throw new Error(value.error);
      if (!value.available) throw new Error(t.unavailable);
      setTotal(value.total);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          checkIn,
          checkOut,
          guests,
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          consent: data.get("consent") === "on",
          website: data.get("website"),
        }),
      });
      const value = (await response.json()) as { id: string; error?: string };
      if (!response.ok) throw new Error(value.error);
      setResult(value);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  const dateFields = (
    <>
      <label className="date-label">
        <span>
          <CalendarDays size={14} />
          {t.arrival}
        </span>
        <input
          aria-label={t.arrival}
          name="checkIn"
          type="date"
          required
          min={localToday()}
          value={checkIn}
          onInput={(e) => {
            setCheckIn(e.currentTarget.value);
            if (checkOut <= e.currentTarget.value) setCheckOut("");
          }}
        />
      </label>
      <label className="date-label">
        <span>
          <CalendarDays size={14} />
          {t.departure}
        </span>
        <input
          aria-label={t.departure}
          name="checkOut"
          type="date"
          required
          min={
            checkIn
              ? new Date(Date.parse(checkIn) + 86400000)
                  .toISOString()
                  .slice(0, 10)
              : localToday()
          }
          value={checkOut}
          onInput={(e) => setCheckOut(e.currentTarget.value)}
        />
      </label>
      <label className="date-label guest-field">
        <span>
          <Users size={14} />
          {t.guests}
        </span>
        <select
          aria-label={t.guests}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
        >
          {Array.from({ length: selected.max_guests }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} {t.people}
            </option>
          ))}
        </select>
      </label>
    </>
  );
  return (
    <>
      <div className="preview-ribbon">
        {preview ? (
          <>
            <span>{t.preview}</span>
            <i /> {t.previewText}
          </>
        ) : (
          <span>SUNSET LUXURY VILLAS · MESSINIA</span>
        )}
      </div>
      <header className="header">
        <a href="#" className="brand" aria-label="Sunset Luxury Villas">
          <img src={asset("logo.jpg")} alt="Sunset Luxury Villas" />
          <span>
            SUNSET <small>LUXURY VILLAS</small>
          </span>
        </a>
        <nav
          aria-label={lang === "el" ? "Κύρια πλοήγηση" : "Main navigation"}
          className={menu ? "nav is-open" : "nav"}
        >
          {t.nav.map((text, i) => (
            <a
              key={i}
              href={["#villa", "#experience", "#gallery", "#location"][i]}
              onClick={() => setMenu(false)}
            >
              {text}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="language"
            onClick={() => setLang(lang === "el" ? "en" : "el")}
            aria-label={
              lang === "el" ? "Switch to English" : "Αλλαγή σε Ελληνικά"
            }
          >
            <Globe size={14} />
            {lang === "el" ? "EN" : "ΕΛ"}
          </button>
          <button className="button small" onClick={openBooking}>
            {t.book}
            <ArrowUpRight size={15} />
          </button>
          <button
            className="mobile-menu icon-button"
            aria-label="Menu"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        <section className="hero">
          <img
            className="hero-image"
            src={asset("thea19.jpg")}
            alt={
              lang === "el"
                ? "Ηλιοβασίλεμα πάνω από την ιδιωτική πισίνα και τη θάλασσα"
                : "Sunset over the private pool and sea"
            }
            fetchPriority="high"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow light">
              <span />
              {t.eyebrow}
            </p>
            <h1>{t.hero}</h1>
            <p className="hero-subtitle">{t.sub}</p>
            <a href="#villa" className="hero-link">
              {t.explore}
              <ArrowDownCircle />
            </a>
          </div>
          <span className="hero-side">
            THE ART OF MEDITERRANEAN SLOW LIVING
          </span>
          <div className="hero-bottom">
            <span>PRIVATE POOL · OPEN HORIZONS</span>
            <span>
              AKRITOCHORI <i /> GREECE
            </span>
          </div>
        </section>
        <div className="search-wrap">
          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              openBooking();
            }}
          >
            {initialProperties.length > 1 && (
              <label className="date-label">
                <span>VILLA</span>
                <select
                  value={propertyId}
                  onChange={(e) => {
                    setPropertyId(e.target.value);
                    setGuests(1);
                  }}
                >
                  {initialProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {dateFields}
            <button className="button search-button" type="submit">
              {t.search}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="search-caption">
            <Sun size={13} />
            {lang === "el"
              ? "Ο χρόνος εδώ κυλάει λίγο πιο αργά."
              : "Time moves a little slower here."}
          </p>
        </div>
        <section className="intro section">
          <div>
            <p className="eyebrow">{t.introLabel}</p>
            <h2>{t.intro}</h2>
          </div>
          <div className="intro-copy">
            <p>{t.introText}</p>
            <a className="text-link" href="#villa">
              {t.details}
              <ArrowUpRight size={17} />
            </a>
          </div>
          <span className="sun-seal" aria-hidden="true">
            <Sun size={48} strokeWidth={0.7} />
            <span>STAY A LITTLE LONGER</span>
          </span>
        </section>
        <section className="villa-section section" id="villa">
          <div className="villa-images">
            <img
              className="villa-main"
              src={asset("spiti1.jpg")}
              alt="Sunset Luxury Villa με ιδιωτική πισίνα"
              loading="lazy"
            />
            <img
              className="villa-detail"
              src={asset("eswteriko1.jpg")}
              alt="Το φωτεινό σαλόνι της βίλας"
              loading="lazy"
            />
            <span className="image-note">A PLACE TO CALL YOUR OWN</span>
          </div>
          <div className="villa-copy">
            <p className="eyebrow">{t.villaLabel}</p>
            <h2>{t.villaTitle}</h2>
            <p className="body-copy">{t.villaText}</p>
            <div className="villa-facts">
              <span>
                <Users size={20} />
                {t.upTo} 6 {t.people}
              </span>
              <span>
                <BedDouble size={21} />2 {t.bedrooms}
              </span>
              <span>
                <Waves size={21} />
                {t.privatePool}
              </span>
            </div>
            <div className="amenities">
              {[
                [Wifi, "Wi-Fi"],
                [Utensils, t.kitchen],
                [Car, t.parking],
                [Snowflake, t.ac],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof Wifi;
                return (
                  <span key={i}>
                    <I size={15} />
                    {text as string}
                  </span>
                );
              })}
            </div>
            <button
              className="text-link"
              onClick={() => {
                setPhoto(1);
                setModal("gallery");
              }}
            >
              {t.viewPhotos}
              <ArrowUpRight size={17} />
            </button>
            <p className="registration">AMA 00002169600</p>
          </div>
        </section>
        {initialProperties.length > 1 && (
          <section className="section more-homes">
            <p className="eyebrow">SUNSET COLLECTION</p>
            <h2>{t.moreHomes}</h2>
            <div className="property-grid">
              {initialProperties.map((p) => (
                <article key={p.id}>
                  {p.image && (
                    <img
                      src={
                        p.image.startsWith("/")
                          ? base + p.image.slice(1)
                          : p.image
                      }
                      alt={p.name}
                    />
                  )}
                  <h3>{p.name}</h3>
                  <p>
                    {p.location} · {p.max_guests} {t.people}
                  </p>
                  <button
                    className="text-link"
                    onClick={() => {
                      setPropertyId(p.id);
                      setGuests(1);
                      openBooking();
                    }}
                  >
                    {t.book}
                    <ArrowUpRight size={16} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
        <section className="experience section" id="experience">
          <div className="section-heading">
            <p className="eyebrow">{t.experience}</p>
            <h2>{t.experienceTitle}</h2>
          </div>
          <div className="experience-grid">
            {[
              {
                image: "thea1.jpg",
                title: t.poolTitle,
                text: t.poolText,
                n: "01",
              },
              {
                image: "eswteriki4.jpg",
                title: t.insideTitle,
                text: t.insideText,
                n: "02",
              },
              {
                image: "epipleon1.jpg",
                title: t.sunsetTitle,
                text: t.sunsetText,
                n: "03",
              },
            ].map((card, i) => (
              <article
                key={card.n}
                className={
                  i === 1 ? "experience-card lowered" : "experience-card"
                }
              >
                <div className="experience-image">
                  <img
                    src={asset(card.image)}
                    alt={card.title}
                    loading="lazy"
                  />
                  <span>{card.n}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="quote-image">
          <img
            src={asset("thea18.jpg")}
            alt="Ο ήλιος δύει πίσω από τα νησάκια μπροστά στη βίλα"
            loading="lazy"
          />
          <div />
          <p>
            {lang === "el" ? (
              <>
                Μερικά μέρη τα επισκέπτεσαι.
                <br />
                Κάποια άλλα <em>τα νιώθεις.</em>
              </>
            ) : (
              <>
                Some places you visit.
                <br />
                Others, <em>you feel.</em>
              </>
            )}
          </p>
          <span>SUNSET LUXURY VILLAS</span>
        </section>
        <section className="gallery section" id="gallery">
          <div className="gallery-heading">
            <div>
              <p className="eyebrow">{t.gallery}</p>
              <h2>{t.galleryTitle}</h2>
            </div>
            <button
              className="text-link"
              onClick={() => {
                setPhoto(0);
                setModal("gallery");
              }}
            >
              {t.all}
              <Plus size={18} />
            </button>
          </div>
          <div className="gallery-grid">
            {[
              "thea11.jpg",
              "dwmatiomegalo1.jpg",
              "eswteriko2.jpg",
              "thea13.jpg",
            ].map((name, i) => (
              <button
                className={"gallery-tile tile-" + i}
                key={name}
                onClick={() => {
                  setPhoto(photoNames.indexOf(name));
                  setModal("gallery");
                }}
                aria-label={`${t.viewPhotos} ${i + 1}`}
              >
                <img
                  src={asset(name)}
                  alt={[t.seaView, t.bedrooms, t.insideTitle, t.privatePool][i]}
                  loading="lazy"
                />
                <span>
                  <Maximize size={18} />
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="location section" id="location">
          <div className="location-image">
            <img
              src={asset("thea20.jpg")}
              alt="Θέα στο μεσσηνιακό τοπίο από τη βεράντα"
              loading="lazy"
            />
            <div className="location-tag">
              <MapPin size={19} />
              <span>
                AKRITOCHORI<small>MESSINIA, GREECE</small>
              </span>
            </div>
          </div>
          <div className="location-copy">
            <p className="eyebrow">{t.location}</p>
            <h2>{t.locationTitle}</h2>
            <p className="body-copy">{t.locationText}</p>
            <ul className="distances">
              {[
                [t.finikounta, "4 km"],
                [t.loutsa, "2 km"],
                [t.mavrovouni, "5 km"],
              ].map(([name, distance]) => (
                <li key={name}>
                  <span>{name}</span>
                  <span>{distance}</span>
                </li>
              ))}
            </ul>
            <a
              className="text-link"
              href="https://www.google.com/maps/search/?api=1&query=Akritochori%20Messinia%20Greece"
              target="_blank"
              rel="noreferrer"
            >
              {t.map}
              <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
        <section className="cta">
          <Sun size={35} strokeWidth={0.8} />
          <p className="eyebrow">{t.ctaLabel}</p>
          <h2>{t.cta}</h2>
          <button className="button cream" onClick={openBooking}>
            {t.ctaButton}
            <ArrowUpRight size={18} />
          </button>
        </section>
      </main>
      <footer>
        <div className="footer-top">
          <a href="#" className="brand footer-brand">
            <img src={asset("logo.jpg")} alt="Sunset Luxury Villas" />
            <span>
              SUNSET<small>LUXURY VILLAS</small>
            </span>
          </a>
          <p>{t.footer}</p>
          <span className="footer-place">
            ΑΚΡΙΤΟΧΩΡΙ, ΜΕΣΣΗΝΙΑ
            <br />
            <small>AKRITOCHORI, MESSINIA · GREECE</small>
          </span>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Sunset Luxury Villas</span>
          <div>
            <button onClick={() => setModal("privacy")}>{t.privacy}</button>
            <a
              href="https://github.com/KL1ME/sunset-villas"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight size={11} />
            </a>
            {!preview && (
              <a href="/admin">{lang === "el" ? "Διαχείριση" : "Management"}</a>
            )}
          </div>
        </div>
      </footer>
      <dialog
        ref={dialogRef}
        className={modal === "gallery" ? "dialog gallery-dialog" : "dialog"}
        onCancel={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              close();
          }
        }}
      >
        <button
          className="dialog-close icon-button"
          onClick={close}
          aria-label={t.close}
        >
          <X size={21} />
        </button>
        {modal === "booking" && (
          <div className="booking-dialog">
            <p className="eyebrow">SUNSET LUXURY VILLAS</p>
            <h2>
              {step === 3 ? t.sent : step === 2 ? t.request : t.modalTitle}
            </h2>
            {step === 1 ? (
              <>
                <p>{t.modalText}</p>
                <form className="booking-form" onSubmit={next}>
                  {initialProperties.length > 1 && (
                    <label>
                      Villa
                      <select
                        value={propertyId}
                        onChange={(e) => {
                          setPropertyId(e.target.value);
                          setGuests(1);
                        }}
                      >
                        {initialProperties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {dateFields}
                  {preview && (
                    <div className="notice">
                      <ShieldCheck size={21} />
                      <p>{t.previewInfo}</p>
                    </div>
                  )}
                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="button" disabled={busy}>
                    {busy ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      t.continue
                    )}
                    <ArrowRight size={17} />
                  </button>
                </form>
              </>
            ) : step === 2 ? (
              <>
                <div className="stay-summary">
                  <img src={asset("spiti1.jpg")} alt="Sunset Luxury Villa" />
                  <div>
                    <h3>{selected.name}</h3>
                    <p>
                      {checkIn} → {checkOut}
                    </p>
                    <p>
                      {nights} {t.night} · {guests} {t.people}
                    </p>
                    <strong>
                      {total !== null
                        ? new Intl.NumberFormat(
                            lang === "el" ? "el-GR" : "en-GB",
                            { style: "currency", currency: "EUR" },
                          ).format(total / 100)
                        : t.rate}
                    </strong>
                  </div>
                </div>
                <p>{t.requestHint}</p>
                {preview ? (
                  <div className="notice">
                    <ShieldCheck size={21} />
                    <p>{t.notActive}</p>
                  </div>
                ) : (
                  <form className="booking-form" onSubmit={send}>
                    <label>
                      {t.name}
                      <input
                        name="name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={120}
                      />
                    </label>
                    <label>
                      {t.email}
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                      />
                    </label>
                    <label>
                      {t.phone}
                      <input
                        name="phone"
                        autoComplete="tel"
                        type="tel"
                        maxLength={40}
                      />
                    </label>
                    <input
                      className="honeypot"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                    />
                    <label className="check-label">
                      <input name="consent" type="checkbox" required />
                      {t.consent}
                    </label>
                    {error && (
                      <p className="form-error" role="alert">
                        {error}
                      </p>
                    )}
                    <button className="button" disabled={busy}>
                      {busy ? (
                        <LoaderCircle className="spin" size={18} />
                      ) : (
                        t.send
                      )}
                      <ArrowRight size={17} />
                    </button>
                  </form>
                )}
                <button className="text-link" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} />
                  {t.back}
                </button>
              </>
            ) : (
              <>
                <div className="success-icon">
                  <Check />
                </div>
                <p>{t.sentText}</p>
                <code>{result?.id}</code>
                <button className="button" onClick={close}>
                  {t.close}
                </button>
              </>
            )}
          </div>
        )}
        {modal === "gallery" && (
          <div
            className="lightbox"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight")
                setPhoto((photo + 1) % photoNames.length);
              if (e.key === "ArrowLeft")
                setPhoto((photo - 1 + photoNames.length) % photoNames.length);
            }}
          >
            <p>
              SUNSET LUXURY VILLAS{" "}
              <span>
                {String(photo + 1).padStart(2, "0")} / {photoNames.length}
              </span>
            </p>
            <img
              src={asset(photoNames[photo])}
              alt={`${lang === "el" ? "Φωτογραφία του καταλύματος" : "Property photograph"} ${photo + 1}`}
            />
            <div className="lightbox-controls">
              <button
                className="icon-button"
                aria-label="Previous photo"
                onClick={() =>
                  setPhoto((photo - 1 + photoNames.length) % photoNames.length)
                }
              >
                <ArrowLeft />
              </button>
              <span>
                {photoNames[photo].startsWith("thea")
                  ? t.seaView
                  : "Sunset Luxury Villa"}
              </span>
              <button
                className="icon-button"
                aria-label="Next photo"
                onClick={() => setPhoto((photo + 1) % photoNames.length)}
              >
                <ArrowRight />
              </button>
            </div>
          </div>
        )}
        {modal === "privacy" && (
          <div className="privacy-dialog">
            <p className="eyebrow">SUNSET LUXURY VILLAS</p>
            <h2>{t.privacy}</h2>
            <p>
              {preview
                ? t.privacyText
                : lang === "el"
                  ? "Η φόρμα αιτήματος αποθηκεύει το ονοματεπώνυμο, το email, το προαιρετικό τηλέφωνο, τις ημερομηνίες και τον αριθμό επισκεπτών στη βάση του καταλύματος, ώστε ο οικοδεσπότης να διαχειριστεί το αίτημα. Το αίτημα δεν αποτελεί επιβεβαιωμένη κράτηση. Η ενεργοποίηση δοκιμαστικής πληρωμής γίνεται μέσω Stripe και τα στοιχεία κάρτας καταχωρίζονται αποκλειστικά στη Stripe. Πριν από την εμπορική λειτουργία χρειάζεται οριστικοποίηση της ενημέρωσης με τα στοιχεία του υπευθύνου επεξεργασίας, τους χρόνους διατήρησης και τον τρόπο άσκησης δικαιωμάτων."
                  : "The request form stores your name, email, optional phone, stay dates and party size in the property database so the host can manage your request. A request is not a confirmed booking. Test checkout is handled by Stripe and card details are entered only on Stripe. Before commercial launch, this notice must be completed with controller details, retention periods and the contact for privacy rights."}
            </p>
            <a
              href={
                preview
                  ? "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                  : "https://stripe.com/privacy"
              }
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              {preview ? "GitHub Privacy Statement" : "Stripe Privacy Policy"}
              <ArrowUpRight size={16} />
            </a>
          </div>
        )}
      </dialog>
    </>
  );
}
function ArrowDownCircle() {
  return (
    <span className="arrow-circle">
      <ArrowRight size={17} />
    </span>
  );
}
