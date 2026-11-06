export type Property = {
  id: string;
  slug: string;
  name: string;
  location: string;
  description: string;
  max_guests: number;
  bedrooms: number;
  min_nights: number;
  base_price: number | null;
  cleaning_fee: number;
  published: number;
  image: string | null;
};
export const villa: Property = {
  id: "sunset-luxury-villa",
  slug: "sunset-luxury-villa",
  name: "Sunset Luxury Villa",
  location: "Ακριτοχώρι, Μεσσηνία",
  description:
    "Ιδιωτική πισίνα, ανεμπόδιστη θέα στη θάλασσα και ο δικός σας χώρος ανάμεσα στους ελαιώνες του Ακριτοχωρίου.",
  max_guests: 6,
  bedrooms: 2,
  min_nights: 1,
  base_price: null,
  cleaning_fee: 0,
  published: 1,
  image: "/photos/spiti1.jpg",
};
export const listingUrl =
  "https://www.booking.com/hotel/gr/sunset-luxury-villa-akritochori2.html";
export const airbnbUrl = "https://www.airbnb.com/rooms/853364043303639063";
export const liveSiteUrl =
  "https://sunset-villas.sunset-villas-messinia.workers.dev";

// Owner references are used by the private calendar dashboard. K2 remains a
// draft until its website content and photos have been reviewed separately.
export const calendarUnits: { code: string; property: Property }[] = [
  { code: "K1", property: villa },
  {
    code: "K2",
    property: {
      id: "sunset-luxury-villa-k2",
      slug: "sunset-luxury-villa-k2",
      name: "Sunset Luxury Villa-K2",
      location: "Ακριτοχώρι, Μεσσηνία",
      description:
        "Δεύτερο κατάλυμα του Sunset Luxury Villa, με ιδιωτική πισίνα και θέα στη θάλασσα.",
      max_guests: 6,
      bedrooms: 2,
      min_nights: 1,
      base_price: null,
      cleaning_fee: 0,
      published: 0,
      image: null,
    },
  },
];
