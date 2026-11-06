import App from "../frontend/src/App";
import { properties } from "@/lib/server";
import { database } from "@/lib/server";
import { publicSettings } from "@/lib/settings";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const settings = await publicSettings(database());
  return {
    robots: {
      index: !settings.demo_mode && settings.booking_enabled,
      follow: !settings.demo_mode && settings.booking_enabled,
    },
  };
}
export default async function Home() {
  return (
    <App
      initialProperties={await properties()}
      initialSettings={await publicSettings(database())}
    />
  );
}
