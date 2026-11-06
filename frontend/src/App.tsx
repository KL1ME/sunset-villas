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
  Copy,
} from "lucide-react";
import {
  villa,
  listingUrl,
  liveSiteUrl,
  type Property,
} from "../../lib/catalog";
import type { PublicSettings } from "../../lib/settings";

type Language = "el" | "en";
type PublicSiteSettings = Omit<PublicSettings, "missing_fields">;
const defaultSettings: PublicSiteSettings = {
  business_name: "Sunset Luxury Villas",
  operator_name: "",
  contact_email: "",
  contact_phone: "",
  privacy_contact: "",
  privacy_retention_days: null,
  cancellation_policy: "",
  check_in: "",
  check_out: "",
  booking_enabled: false,
  demo_mode: false,
};
const copy = {
  el: {
    nav: ["Διαμονή", "Εμπειρίες", "Φωτογραφίες", "Τοποθεσία"],
    staysNav: "Καταλύματα",
    book: "Κράτηση",
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
    liveModalText:
      "Επιλέξτε κατάλυμα, ημερομηνίες και επισκέπτες για έλεγχο διαθεσιμότητας.",
    liveContinue: "Έλεγχος διαθεσιμότητας",
    noProperties:
      "Δεν υπάρχουν διαθέσιμα καταλύματα για νέα αιτήματα αυτή τη στιγμή.",
    property: "Κατάλυμα",
    networkError:
      "Η σύνδεση δεν ολοκληρώθηκε. Ελέγξτε το δίκτυό σας και δοκιμάστε ξανά.",
    timeoutError: "Ο έλεγχος διαθεσιμότητας άργησε. Δοκιμάστε ξανά σε λίγο.",
    availabilityError:
      "Η διαθεσιμότητα δεν μπορεί να επιβεβαιωθεί αυτή τη στιγμή. Δοκιμάστε ξανά αργότερα.",
    requestTimeout:
      "Η επιβεβαίωση αποστολής καθυστέρησε. Πατήστε ξανά αποστολή για έλεγχο του αιτήματός σας.",
    statusLink: "Παρακολούθηση αιτήματος",
    statusHint:
      "Αποθηκεύστε τον ιδιωτικό σύνδεσμο για να βλέπετε την κατάσταση του αιτήματός σας. Όποιος έχει τον σύνδεσμο μπορεί να το ανοίξει.",
    copyLink: "Αντιγραφή ιδιωτικού συνδέσμου",
    copiedLink: "Ο ιδιωτικός σύνδεσμος αντιγράφηκε.",
    copyError:
      "Η αντιγραφή δεν ολοκληρώθηκε. Μπορείτε να ανοίξετε και να αποθηκεύσετε τον σύνδεσμο.",
    minimumStay: "Ελάχιστη διαμονή",
    privacyLive:
      "Τα στοιχεία της φόρμας (ονοματεπώνυμο, email, προαιρετικό τηλέφωνο, ημερομηνίες και αριθμός επισκεπτών) χρησιμοποιούνται για τη διαχείριση του αιτήματος και της επικοινωνίας σχετικά με τη διαμονή σας. Το αίτημα δεν αποτελεί επιβεβαιωμένη κράτηση. Ο ιδιωτικός σύνδεσμος παρακολούθησης επιτρέπει πρόσβαση στην κατάσταση του αιτήματος· φυλάξτε τον ιδιωτικό.",
    setupNotice:
      "Η απευθείας αποστολή αιτημάτων δεν έχει ενεργοποιηθεί ακόμη. Μπορείτε να επικοινωνήσετε με το κατάλυμα ή να δείτε την καταχώριση στην πλατφόρμα.",
    contact: "Επικοινωνία",
    platform: "Δείτε το κατάλυμα στην Booking.com",
    stayTerms: "Όροι διαμονής και ακυρώσεων",
    demoNotice:
      "Δοκιμαστική λειτουργία — τα στοιχεία επικοινωνίας είναι προσωρινά. Μη χρησιμοποιείτε πραγματικά προσωπικά στοιχεία. Οι δοκιμαστικές κρατήσεις δεν ισχύουν για διαμονή.",
    demoContact: "Προσωρινά δοκιμαστικά στοιχεία",
  },
  en: {
    nav: ["Stay", "Experiences", "Gallery", "Location"],
    staysNav: "Our stays",
    book: "Book your stay",
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
    liveModalText:
      "Choose a property, dates and number of guests to check availability.",
    liveContinue: "Check availability",
    noProperties: "No properties are accepting new requests at the moment.",
    property: "Property",
    networkError:
      "The connection could not be completed. Check your network and try again.",
    timeoutError:
      "The availability check took too long. Please try again shortly.",
    availabilityError:
      "Availability cannot be confirmed at the moment. Please try again later.",
    requestTimeout:
      "Confirmation of your request is taking longer than expected. Select Send request again to check your submission.",
    statusLink: "Track your request",
    statusHint:
      "Save your private link to follow your request's status. Anyone with this link can open it.",
    copyLink: "Copy private link",
    copiedLink: "Your private link has been copied.",
    copyError:
      "The link could not be copied. You can open and save it instead.",
    minimumStay: "Minimum stay",
    privacyLive:
      "The details in this form (name, email, optional phone, stay dates and party size) are used to manage your request and communications about your stay. A request is not a confirmed booking. Your private tracking link provides access to the request's status; keep it private.",
    setupNotice:
      "Direct booking requests are not active yet. You can contact the property or view its listing on the booking platform.",
    contact: "Contact",
    platform: "View the property on Booking.com",
    stayTerms: "Stay and cancellation terms",
    demoNotice:
      "Demo mode — contact details are temporary. Do not use real personal information. Test bookings are not valid for a stay.",
    demoContact: "Temporary demo details",
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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export default function App({
  preview = false,
  initialProperties = [villa],
  initialSettings = defaultSettings,
}: {
  preview?: boolean;
  initialProperties?: Property[];
  initialSettings?: PublicSiteSettings;
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
    [propertyId, setPropertyId] = useState(initialProperties[0]?.id || ""),
    [step, setStep] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      id: string;
      statusToken?: string;
      statusUrl?: string;
    } | null>(null),
    [total, setTotal] = useState<number | null>(null),
    [linkNotice, setLinkNotice] = useState("");
  const t = copy[lang],
    selected = initialProperties.find((p) => p.id === propertyId),
    featured = initialProperties.find((p) => p.id === villa.id),
    hasProperties = initialProperties.length > 0,
    showVillaStory = Boolean(featured),
    dialogRef = useRef<HTMLDialogElement>(null),
    menuToggleRef = useRef<HTMLButtonElement>(null),
    previousFocus = useRef<HTMLElement | null>(null),
    availabilityRef = useRef<AbortController | null>(null),
    inFlightRef = useRef<"availability" | "request" | null>(null),
    requestKeyRef = useRef<{ intent: string; key: string } | null>(null);
  const base = preview ? "/sunset-villas/" : "/";
  const asset = (name: string) => base + "photos/" + name;
  const bookingEnabled = !preview && initialSettings.booking_enabled;
  const privacyDetails = [
    t.privacyLive,
    initialSettings.operator_name
      ? `${initialSettings.demo_mode ? t.demoContact : lang === "el" ? "Υπεύθυνος διαχείρισης" : "Operator"}: ${initialSettings.operator_name}.`
      : "",
    initialSettings.privacy_contact
      ? `${lang === "el" ? "Για θέματα απορρήτου και δικαιώματα" : "For privacy enquiries and rights"}: ${initialSettings.privacy_contact}.`
      : "",
    initialSettings.privacy_retention_days !== null
      ? `${lang === "el" ? "Χρόνος διατήρησης στοιχείων μετά τη διαμονή" : "Data retention after the stay"}: ${initialSettings.privacy_retention_days} ${lang === "el" ? "ημέρες" : "days"}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const propertyImage = (property: Property | undefined) =>
    property?.image
      ? property.image.startsWith("/")
        ? base + property.image.slice(1)
        : property.image
      : null;
  const privateStatusLink =
    result?.statusToken && result.statusUrl === "/booking/" + result.id
      ? result.statusUrl + "#" + encodeURIComponent(result.statusToken)
      : null;
  const invalidateAvailability = () => {
    availabilityRef.current?.abort();
    availabilityRef.current = null;
    if (inFlightRef.current === "availability") {
      inFlightRef.current = null;
      setBusy(false);
    }
    setTotal(null);
    requestKeyRef.current = null;
  };
  const close = () => {
    if (inFlightRef.current === "request") return;
    invalidateAvailability();
    setModal(null);
    setError("");
    setStep(1);
    setResult(null);
    setLinkNotice("");
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
      if (previousFocus.current) {
        if (previousFocus.current.getClientRects().length)
          previousFocus.current.focus();
        else menuToggleRef.current?.focus();
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);
  useEffect(() => () => availabilityRef.current?.abort(), []);
  const chooseProperty = (id: string) => {
    const property = initialProperties.find((p) => p.id === id);
    if (!property || inFlightRef.current === "request") return;
    invalidateAvailability();
    setPropertyId(id);
    setGuests(Math.min(guests, property.max_guests));
    setStep(1);
    setError("");
  };
  const openBooking = (id = propertyId) => {
    if (!initialProperties.some((p) => p.id === id)) return;
    chooseProperty(id);
    setError("");
    setStep(1);
    setResult(null);
    setLinkNotice("");
    setModal("booking");
  };
  const nights =
    checkIn && checkOut
      ? Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000)
      : 0;
  async function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || !selected) return;
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
    if (!bookingEnabled) return;
    const controller = new AbortController();
    availabilityRef.current = controller;
    inFlightRef.current = "availability";
    const timeout = setTimeout(() => controller.abort(), 35000);
    setBusy(true);
    try {
      const response = await fetch(
        `/api/availability?${new URLSearchParams({ propertyId, checkIn: arrival, checkOut: departure, guests: String(guests) })}`,
        { signal: controller.signal },
      );
      const value = (await response.json()) as {
        error?: string;
        available: boolean;
        total: number | null;
      };
      if (availabilityRef.current !== controller) return;
      if (!response.ok)
        throw new Error(
          response.status >= 500
            ? t.availabilityError
            : value.error || t.networkError,
        );
      if (!value.available) throw new Error(t.unavailable);
      setTotal(value.total);
      setStep(2);
    } catch (e) {
      if (availabilityRef.current === controller)
        setError(
          controller.signal.aborted
            ? t.timeoutError
            : e instanceof TypeError
              ? t.networkError
              : e instanceof Error
                ? e.message
                : t.networkError,
        );
    } finally {
      clearTimeout(timeout);
      if (availabilityRef.current === controller) {
        availabilityRef.current = null;
        inFlightRef.current = null;
        setBusy(false);
      }
    }
  }
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookingEnabled || inFlightRef.current || !selected) return;
    const data = new FormData(event.currentTarget);
    const input = {
      propertyId,
      checkIn,
      checkOut,
      guests,
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      consent: data.get("consent") === "on",
      website: data.get("website"),
    };
    const intent = JSON.stringify(input);
    if (requestKeyRef.current?.intent !== intent)
      requestKeyRef.current = { intent, key: crypto.randomUUID() };
    inFlightRef.current = "request";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...input,
          requestKey: requestKeyRef.current.key,
        }),
      });
      const value = (await response.json()) as {
        id: string;
        statusToken?: string;
        statusUrl?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(value.error || t.networkError);
      if (typeof value.id !== "string" || !value.id)
        throw new Error(t.networkError);
      setResult(value);
      requestKeyRef.current = null;
      setStep(3);
    } catch (e) {
      setError(
        controller.signal.aborted
          ? t.requestTimeout
          : e instanceof TypeError || e instanceof SyntaxError
            ? t.networkError
            : e instanceof Error
              ? e.message
              : t.networkError,
      );
    } finally {
      clearTimeout(timeout);
      inFlightRef.current = null;
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
            invalidateAvailability();
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
              ? new Date(
                  Date.parse(checkIn) + (selected?.min_nights || 1) * 86400000,
                )
                  .toISOString()
                  .slice(0, 10)
              : localToday()
          }
          value={checkOut}
          onInput={(e) => {
            invalidateAvailability();
            setCheckOut(e.currentTarget.value);
          }}
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
          onChange={(e) => {
            invalidateAvailability();
            setGuests(Number(e.target.value));
          }}
        >
          {Array.from({ length: selected?.max_guests || 1 }, (_, i) => (
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
            <a href={liveSiteUrl}>
              {lang === "el" ? "Άνοιγμα εφαρμογής →" : "Open full website →"}
            </a>
          </>
        ) : (
          <span>SUNSET LUXURY VILLAS · MESSINIA</span>
        )}
      </div>
      {!preview && initialSettings.demo_mode && (
        <div className="demo-banner" role="note">
          {t.demoNotice}
        </div>
      )}
      <header
        className="header"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menu) {
            setMenu(false);
            menuToggleRef.current?.focus();
          }
        }}
      >
        <a href="#" className="brand" aria-label="Sunset Luxury Villas">
          <img src={asset("logo.jpg")} alt="Sunset Luxury Villas" />
          <span>
            SUNSET <small>LUXURY VILLAS</small>
          </span>
        </a>
        <nav
          id="primary-navigation"
          aria-label={lang === "el" ? "Κύρια πλοήγηση" : "Main navigation"}
          className={menu ? "nav is-open" : "nav"}
        >
          {(showVillaStory
            ? t.nav.map((text, i) => ({
                text:
                  i === 0 && initialProperties.length > 1 ? t.staysNav : text,
                href: [
                  initialProperties.length > 1 ? "#stays" : "#villa",
                  "#experience",
                  "#gallery",
                  "#location",
                ][i],
              }))
            : hasProperties
              ? [{ text: t.staysNav, href: "#stays" }]
              : []
          ).map(({ text, href }) => (
            <a key={href} href={href} onClick={() => setMenu(false)}>
              {text}
            </a>
          ))}
          <button
            type="button"
            className="button small nav-booking"
            aria-haspopup="dialog"
            disabled={!hasProperties}
            onClick={() => {
              setMenu(false);
              openBooking();
            }}
          >
            {t.book}
            <ArrowUpRight size={15} />
          </button>
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
          <button
            ref={menuToggleRef}
            className="mobile-menu icon-button"
            aria-label={lang === "el" ? "Μενού" : "Menu"}
            aria-expanded={menu}
            aria-controls="primary-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        <section className="hero">
          {(showVillaStory || propertyImage(selected)) && (
            <img
              className="hero-image"
              src={
                showVillaStory ? asset("thea19.jpg") : propertyImage(selected)!
              }
              alt={
                showVillaStory
                  ? lang === "el"
                    ? "Ηλιοβασίλεμα πάνω από την ιδιωτική πισίνα και τη θάλασσα"
                    : "Sunset over the private pool and sea"
                  : selected?.name || ""
              }
              fetchPriority="high"
            />
          )}
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow light">
              <span />
              {t.eyebrow}
            </p>
            <h1>{t.hero}</h1>
            <p className="hero-subtitle">{t.sub}</p>
            <a
              href={showVillaStory ? "#villa" : "#stays"}
              className="hero-link"
            >
              {showVillaStory ? t.explore : t.moreHomes}
              <ArrowDownCircle />
            </a>
          </div>
          <span className="hero-side">
            THE ART OF MEDITERRANEAN SLOW LIVING
          </span>
          <div className="hero-bottom">
            <span>
              {showVillaStory
                ? "PRIVATE POOL · OPEN HORIZONS"
                : initialSettings.business_name}
            </span>
            <span>
              {showVillaStory ? (
                <>
                  AKRITOCHORI <i /> GREECE
                </>
              ) : (
                selected?.location
              )}
            </span>
          </div>
        </section>
        <div className="search-wrap" id={hasProperties ? undefined : "stays"}>
          {!hasProperties ? (
            <p className="no-properties" role="status">
              {t.noProperties}
            </p>
          ) : (
            <>
              <form
                className="search-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  openBooking();
                }}
              >
                {initialProperties.length > 1 && (
                  <label className="date-label">
                    <span>{t.property}</span>
                    <select
                      value={propertyId}
                      onChange={(e) => chooseProperty(e.target.value)}
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
            </>
          )}
        </div>
        {showVillaStory && (
          <>
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
                    {t.upTo} {featured!.max_guests} {t.people}
                  </span>
                  <span>
                    <BedDouble size={21} />
                    {featured!.bedrooms} {t.bedrooms}
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
          </>
        )}
        {(initialProperties.length > 1 ||
          (!showVillaStory && hasProperties)) && (
          <section className="section more-homes" id="stays">
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
                  <p>{p.description}</p>
                  <button
                    className="text-link"
                    onClick={() => {
                      openBooking(p.id);
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
        {showVillaStory && (
          <>
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
                      alt={
                        [t.seaView, t.bedrooms, t.insideTitle, t.privatePool][i]
                      }
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
          </>
        )}
        <section className="cta">
          <Sun size={35} strokeWidth={0.8} />
          <p className="eyebrow">{t.ctaLabel}</p>
          <h2>{t.cta}</h2>
          <button
            className="button cream"
            disabled={!hasProperties}
            onClick={() => openBooking()}
          >
            {t.ctaButton}
            <ArrowUpRight size={18} />
          </button>
        </section>
      </main>
      <footer id="footer">
        <div className="footer-top">
          <a href="#" className="brand footer-brand">
            <img src={asset("logo.jpg")} alt="Sunset Luxury Villas" />
            <span>
              SUNSET<small>LUXURY VILLAS</small>
            </span>
          </a>
          <p>{t.footer}</p>
          {showVillaStory && (
            <span className="footer-place">
              ΑΚΡΙΤΟΧΩΡΙ, ΜΕΣΣΗΝΙΑ
              <br />
              <small>AKRITOCHORI, MESSINIA · GREECE</small>
            </span>
          )}
        </div>
        {!preview &&
          (initialSettings.contact_email || initialSettings.contact_phone) && (
            <div className="footer-contact">
              <span>
                {initialSettings.demo_mode ? t.demoContact : t.contact}
              </span>
              {initialSettings.contact_email &&
                (initialSettings.demo_mode ? (
                  <span>{initialSettings.contact_email}</span>
                ) : (
                  <a href={"mailto:" + initialSettings.contact_email}>
                    {initialSettings.contact_email}
                  </a>
                ))}
              {initialSettings.contact_phone &&
                (initialSettings.demo_mode ? (
                  <span>{initialSettings.contact_phone}</span>
                ) : (
                  <a
                    href={
                      "tel:" +
                      initialSettings.contact_phone.replace(/[^+\d]/g, "")
                    }
                  >
                    {initialSettings.contact_phone}
                  </a>
                ))}
            </div>
          )}
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {initialSettings.business_name}
          </span>
          <div>
            <button onClick={() => setModal("privacy")}>{t.privacy}</button>
            {preview && (
              <a href={liveSiteUrl}>
                {lang === "el"
                  ? "Πλήρης εφαρμογή κρατήσεων"
                  : "Full booking website"}
                <ArrowUpRight size={11} />
              </a>
            )}
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
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
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
          disabled={busy && inFlightRef.current === "request"}
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
            {!preview && initialSettings.demo_mode && (
              <div className="notice demo-booking-notice">
                <ShieldCheck size={21} />
                <p>{t.demoNotice}</p>
              </div>
            )}
            {!preview && !bookingEnabled ? (
              <div className="booking-setup">
                <p>{t.setupNotice}</p>
                {initialSettings.contact_email &&
                  !initialSettings.demo_mode && (
                    <a
                      className="text-link"
                      href={"mailto:" + initialSettings.contact_email}
                    >
                      {initialSettings.contact_email}
                    </a>
                  )}
                {initialSettings.contact_phone &&
                  !initialSettings.demo_mode && (
                    <a
                      className="text-link"
                      href={
                        "tel:" +
                        initialSettings.contact_phone.replace(/[^+\d]/g, "")
                      }
                    >
                      {initialSettings.contact_phone}
                    </a>
                  )}
                {selected?.id === villa.id && (
                  <a
                    className="button"
                    href={listingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.platform}
                    <ArrowUpRight size={17} />
                  </a>
                )}
              </div>
            ) : step === 1 ? (
              <>
                <p>{preview ? t.modalText : t.liveModalText}</p>
                <form className="booking-form" onSubmit={next}>
                  {initialProperties.length > 1 && (
                    <label>
                      {t.property}
                      <select
                        value={propertyId}
                        onChange={(e) => chooseProperty(e.target.value)}
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
                  {selected && selected.min_nights > 1 && (
                    <p className="minimum-stay">
                      {t.minimumStay}: {selected.min_nights} {t.night}.
                    </p>
                  )}
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
                    ) : preview ? (
                      t.continue
                    ) : (
                      t.liveContinue
                    )}
                    <ArrowRight size={17} />
                  </button>
                </form>
              </>
            ) : step === 2 ? (
              <>
                <div className="stay-summary">
                  {propertyImage(selected) ? (
                    <img
                      src={propertyImage(selected)!}
                      alt={selected?.name || ""}
                    />
                  ) : (
                    <div className="stay-no-photo">
                      <BedDouble size={35} />
                    </div>
                  )}
                  <div>
                    <h3>{selected?.name}</h3>
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
                        disabled={busy}
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
                        disabled={busy}
                      />
                    </label>
                    <label>
                      {t.phone}
                      <input
                        name="phone"
                        autoComplete="tel"
                        type="tel"
                        maxLength={40}
                        disabled={busy}
                      />
                    </label>
                    <input
                      className="honeypot"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                    />
                    <details className="privacy-inline">
                      <summary>{t.privacy}</summary>
                      <p>{privacyDetails}</p>
                    </details>
                    {(initialSettings.cancellation_policy ||
                      initialSettings.check_in ||
                      initialSettings.check_out) && (
                      <details className="privacy-inline">
                        <summary>{t.stayTerms}</summary>
                        {initialSettings.cancellation_policy && (
                          <p>{initialSettings.cancellation_policy}</p>
                        )}
                        {initialSettings.check_in && (
                          <p>
                            {t.arrival}: {initialSettings.check_in}
                          </p>
                        )}
                        {initialSettings.check_out && (
                          <p>
                            {t.departure}: {initialSettings.check_out}
                          </p>
                        )}
                      </details>
                    )}
                    <label className="check-label">
                      <input
                        name="consent"
                        type="checkbox"
                        required
                        disabled={busy}
                      />
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
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => {
                    invalidateAvailability();
                    setStep(1);
                  }}
                >
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
                {privateStatusLink && (
                  <div className="booking-status-actions">
                    <p>{t.statusHint}</p>
                    <a
                      className="button"
                      href={privateStatusLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.statusLink}
                      <ArrowUpRight size={17} />
                    </a>
                    <button
                      type="button"
                      className="text-link"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            new URL(privateStatusLink, location.origin).href,
                          );
                          setLinkNotice(t.copiedLink);
                        } catch {
                          setLinkNotice(t.copyError);
                        }
                      }}
                    >
                      <Copy size={15} />
                      {t.copyLink}
                    </button>
                    {linkNotice && <p role="status">{linkNotice}</p>}
                  </div>
                )}
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
            <p>{preview ? t.privacyText : privacyDetails}</p>
            {preview && (
              <a
                href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                GitHub Privacy Statement
                <ArrowUpRight size={16} />
              </a>
            )}
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
