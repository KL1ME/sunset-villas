import App from "../frontend/src/App";
import { properties } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <App initialProperties={await properties()} />;
}
