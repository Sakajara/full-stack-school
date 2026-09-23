"use client";

import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth-context";
import { canAccess, homeFor } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { loading, user, role, institution } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  // Route guard for the interface. The data itself is protected by
  // firestore.rules whatever the browser does.
  const allowed = canAccess(pathname, role);
  useEffect(() => {
    if (loading) return;
    if (!user || !role) router.replace("/");
    else if (!allowed) router.replace(homeFor(role));
  }, [loading, user, role, allowed, router]);

  useEffect(() => setDrawer(false), [pathname]);

  if (loading || !role || !allowed) return <Spinner />;

  const brand = (
    <Link href={homeFor(role)} className="flex items-center justify-center lg:justify-start gap-2">
      <Image src="/logo.png" alt="logo" width={32} height={32} />
      <span className="hidden lg:block font-bold">{institution?.shortName ?? "Chuo"}</span>
    </Link>
  );

  return (
    <div className="h-screen flex">
      {/* LEFT: icons on tablets, full menu on desktops, hidden on phones */}
      <aside className="hidden print:hidden md:block md:w-[8%] lg:w-[16%] xl:w-[14%] p-4 overflow-y-auto">
        {brand}
        <Menu />
      </aside>

      {/* Phone drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-surface p-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold">
                <Image src="/logo.png" alt="" width={28} height={28} />
                {institution?.shortName ?? "Chuo"}
              </span>
              <button onClick={() => setDrawer(false)} aria-label="Close menu">
                <Image src="/close.png" alt="" width={14} height={14} />
              </button>
            </div>
            <Menu expanded onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* RIGHT */}
      <main className="w-full md:w-[92%] lg:w-[84%] xl:w-[86%] bg-canvas overflow-y-auto flex flex-col">
        <Navbar onMenu={() => setDrawer(true)} />
        {children}
      </main>
    </div>
  );
}
