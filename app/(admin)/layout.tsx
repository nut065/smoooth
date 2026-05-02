import { cookies } from "next/headers";
import { PinGate } from "./PinGate";
import { AdminHeader } from "./AdminHeader";
import { getSetting } from "@/lib/domain/settings";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminPin = await getSetting("admin_pin", process.env.ADMIN_PIN ?? "1234");
  const cookieStore = await cookies();
  const authenticated = cookieStore.get("admin_auth")?.value === adminPin;

  if (!authenticated) return <PinGate />;

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-950 text-white">
      <AdminHeader />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
