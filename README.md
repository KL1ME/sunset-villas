# Sunset Luxury Villas

Ιστοσελίδα για το Sunset Luxury Villa στο Ακριτοχώρι Μεσσηνίας, με πραγματικό λογότυπο και φωτογραφίες, ελληνικά/αγγλικά και κώδικα για διαχείριση πολλών καταλυμάτων.

**Προεπισκόπηση design:** https://kl1me.github.io/sunset-villas/

Η έκδοση στο GitHub Pages είναι αποκλειστικά προεπισκόπηση: δεν συλλέγει στοιχεία επισκεπτών, δεν καλεί το backend, δεν δείχνει ζωντανή διαθεσιμότητα και δεν δέχεται κρατήσεις ή πληρωμές. Το πλήρες app δεν έχει αναπτυχθεί σε υπηρεσία backend. Δεν έχουν συνδεθεί επαγγελματικός λογαριασμός Stripe ή πραγματικά ημερολόγια.

## Δομή

| Μέρος                       | Κώδικας                       | Εκτέλεση                               |
| --------------------------- | ----------------------------- | -------------------------------------- |
| Δημόσια προεπισκόπηση       | `frontend/`                   | Vite + React, GitHub Pages             |
| Πλήρες app και API          | `app/`, `lib/`, `worker/`     | Vinext / Cloudflare Workers            |
| Βάση                        | `db/schema.ts`, `drizzle/`    | Cloudflare D1 / SQLite                 |
| Αυτόματη δημοσίευση preview | `.github/workflows/pages.yml` | GitHub Actions σε κάθε push στο `main` |

Η φιλοξενία εμπορικών συναλλαγών δεν επιτρέπεται από τους [περιορισμούς του GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). Η κανονική λειτουργία του site πρέπει να μεταφερθεί σε κατάλληλο hosting, με frontend και API στο ίδιο origin. Το δημόσιο repository παραμένει πηγή του κώδικα.

## Τι υλοποιείται στο backend

- Προσθήκη/επεξεργασία/δημοσίευση καταλυμάτων, χωρητικότητα, βασική τιμή ανά νύχτα, χρέωση καθαρισμού και ελάχιστη διαμονή. Νέα δημοσιευμένα καταλύματα εμφανίζονται αυτόματα στο πλήρες app. Η στατική προεπισκόπηση είναι ανεξάρτητη.
- Αιτήματα κράτησης με server-side έλεγχο ημερομηνιών, χωρητικότητας και συνολικής τιμής σε ακέραια λεπτά. Αρχικά η τιμή της βίλας παραμένει κενή, μέχρι να οριστεί από τον ιδιοκτήτη.
- Καταστάσεις `requested`, `held`, `confirmed`, `cancelled`, `expired`, `payment_review`. Τα αιτήματα δεν δεσμεύουν νύχτες.
- Ατομική δέσμευση μέσω D1 batch και μοναδικού `(property_id, date)`, ώστε δύο επικαλυπτόμενες επιβεβαιώσεις του site να μην επιτύχουν μαζί. Η αναχώρηση δεν δεσμεύεται ως νύχτα.
- Dashboard αιτημάτων, ημερολόγιο δεσμεύσεων του site, διαχείριση καταλυμάτων και κατάσταση συνδέσεων. Προστασία του API διαχείρισης με `ADMIN_TOKEN` 32+ χαρακτήρων. Το token παραμένει στη μνήμη του browser, όχι σε localStorage.
- iCal import ανά κατάλυμα για Airbnb / Booking, HTTPS allowlist, όριο μεγέθους, timeout, απαγόρευση redirects, ατομική αντικατάσταση επιτυχούς snapshot και διατήρηση προηγούμενων δεσμεύσεων σε αποτυχία. Υποστηρίζονται ολοήμερα, μη επαναλαμβανόμενα VEVENTs· άλλα είδη απορρίπτονται για έλεγχο.
- iCal export με μη προβλέψιμο URL και μόνο δεσμευμένες ημερομηνίες του site, χωρίς ονόματα/email/τηλέφωνα. Δεν επανεξάγονται εισαγόμενα συμβάντα για αποφυγή κύκλων.
- Worker cron κάθε 15 λεπτά μετά το deployment, ανανέωση παλιών ημερολογίων κατά τον έλεγχο διαθεσιμότητας και προαιρετικό HTTP sync endpoint με ξεχωριστό bearer secret.
- Stripe Checkout **σε test mode μόνο**, μετά από έλεγχο του οικοδεσπότη. Ποσό από τη βάση, idempotency key, προσωρινή δέσμευση, επαλήθευση υπογραφής webhook, ποσού και νομίσματος, idempotent επιβεβαίωση. Καθυστερημένη πληρωμή χωρίς ενεργές δεσμεύσεις πηγαίνει σε `payment_review`.
- Έλεγχος Origin στις εγγραφές, περιορισμός αιτημάτων και μη δημοσίευση των iCal URLs/στοιχείων επισκεπτών.

Το iCal δεν συγχρονίζει τιμές και δεν εγγυάται αποφυγή διπλοκρατήσεων μεταξύ πλατφορμών. Η [Airbnb αναφέρει ανανέωση ανά 3 ώρες](https://www.airbnb.com/help/article/99). Η [Booking δεν προσφέρει απευθείας Connectivity API σε μεμονωμένα καταλύματα](https://connect.booking.com/?lang=en). Για άμεσες επιβεβαιώσεις χρειάζεται κατάλληλος εγκεκριμένος channel manager. Δεν έχει υλοποιηθεί σύνδεση με συγκεκριμένο channel manager.

## Τοπική προεπισκόπηση

Node.js 22.18+ ή 24 και npm.

```sh
npm ci
npm run dev:pages
```

Ανοίξτε `http://127.0.0.1:5173/sunset-villas/`.

```sh
npm run typecheck
npm test
npm run build:pages
```

## Τοπικό πλήρες app

```sh
cp .env.example .dev.vars
# Συμπληρώστε ένα δικό σας ADMIN_TOKEN. Μη χρησιμοποιείτε το fixture των tests.
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_uneven_deadpool.sql
npm run dev -- --port 5174
```

- Site: `http://127.0.0.1:5174/`
- Dashboard: `http://127.0.0.1:5174/admin`
- Τοπική και παραγωγική βάση είναι διαφορετικές. Ποτέ μην ανεβάζετε `.dev.vars`, `.wrangler`, πραγματικά στοιχεία επισκεπτών ή database dumps στο repository.

Προαιρετικός έλεγχος του τοπικού API, που γράφει μόνο αναγνωρίσιμα fixture δεδομένα:

```sh
TEST_ADMIN_TOKEN='το-τοπικό-admin-token' node tests/integration.mjs
```

Το script αρνείται να εκτελεστεί σε μη-loopback διευθύνσεις.

## Ανάπτυξη backend σε δικό σας Cloudflare λογαριασμό

Απαιτούνται δικός σας λογαριασμός Cloudflare και D1 database. Οι παρακάτω ενέργειες **δεν έχουν εκτελεστεί** στην παραγωγή.

```sh
npx wrangler login
npx wrangler d1 create sunset-villas
npm run build
node scripts/prepare-cloudflare.mjs YOUR_D1_DATABASE_UUID sunset-villas
npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.production.json
npx wrangler secret put ADMIN_TOKEN --config dist/server/wrangler.production.json
npx wrangler secret put SITE_ORIGIN --config dist/server/wrangler.production.json
npx wrangler deploy --config dist/server/wrangler.production.json
```

Χρησιμοποιήστε το δικό σας πραγματικό HTTPS origin στο `SITE_ORIGIN`. Μετά το deployment ελέγξτε ότι ενεργοποιήθηκε το cron `*/15 * * * *` και ότι τα ημερολόγια ανανεώνονται. Καταχωρίστε τα πραγματικά iCal export URLs στο dashboard και εισαγάγετε το iCal URL του site στις πλατφόρμες.

Για δοκιμή πληρωμών, ρυθμίστε τα `STRIPE_SECRET_KEY` (`sk_test_...`) και `STRIPE_WEBHOOK_SECRET` (`whsec_...`) ως Worker secrets και δηλώστε το `/api/stripe/webhook` στο Stripe test dashboard για `checkout.session.completed`. Δεν απαιτείται ούτε επιτρέπεται αποθήκευση στοιχείων κάρτας στο app. Το redirect επιτυχίας δεν επιβεβαιώνει πληρωμή· αυτό γίνεται μόνο από επαληθευμένο webhook. [Οδηγίες Stripe](https://docs.stripe.com/checkout/fulfillment)

Πριν από κανονική λειτουργία απομένουν: επιλογή και σύνδεση channel manager, λογαριασμός παρόχου πληρωμών και πλήρεις δοκιμές sandbox, πολιτικές τιμών/ακυρώσεων/φόρων και στοιχεία επιχείρησης, πλήρης πολιτική απορρήτου, ενημερώσεις email, seasonal pricing, monitoring/backups και έλεγχος production authentication. Η τρέχουσα έκδοση δεν περιλαμβάνει επιστροφές χρημάτων, λογιστικά παραστατικά ή live πληρωμές.

## Υλικό & επαλήθευση

Οι 35 εικόνες του φακέλου `public/photos/` (34 φωτογραφίες και 1 λογότυπο) προέρχονται από το ZIP που παρασχέθηκε από τον ιδιοκτήτη. Έχουν αφαιρεθεί τα EXIF metadata. Τα στοιχεία της πρώτης βίλας βασίστηκαν στην [καταχώριση Booking](https://www.booking.com/hotel/gr/sunset-luxury-villa-akritochori2.html) και στην [καταχώριση Airbnb](https://www.airbnb.com/rooms/853364043303639063). Οι ώρες check-in/out, οι τιμές και οι πολιτικές χρειάζονται ορισμό από τον ιδιοκτήτη πριν δημοσιευτούν ως όροι κράτησης.

Η γραμματοσειρά Inter φιλοξενείται τοπικά, με την άδειά της στο `frontend/src/fonts/LICENSE.txt`. Οι φωτογραφίες και η εμπορική ταυτότητα δεν διατίθενται με άδεια επαναχρησιμοποίησης επειδή το repository είναι δημόσιο.
