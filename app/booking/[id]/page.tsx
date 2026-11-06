import type { Metadata } from "next";
import BookingStatus from "./status";
import "../booking.css";

export const metadata: Metadata = {
  title: "Το αίτημά σας · Sunset Luxury Villas",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingStatus key={id} id={id} />;
}
