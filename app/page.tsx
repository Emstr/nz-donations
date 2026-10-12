import { Dashboard } from "@/components/dashboard";
import { counted } from "@/lib/data";

export default function HomePage() {
  return <Dashboard donations={counted} />;
}
