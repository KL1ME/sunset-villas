import type { Metadata } from "next";
import "../frontend/src/style.css";
export const metadata: Metadata = {
  title: "Sunset Luxury Villas · Μεσσηνία",
  description:
    "Sunset Luxury Villa στο Ακριτοχώρι Μεσσηνίας, με ιδιωτική πισίνα και θέα στη θάλασσα.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
