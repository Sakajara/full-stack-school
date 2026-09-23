"use client";

import { useAuth } from "@/lib/auth-context";
import { col, useLiveQuery } from "@/lib/live";
import { ROLE_LABEL } from "@/lib/types";
import { limit, query, where } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const Navbar = ({ onMenu }: { onMenu?: () => void }) => {
  const { user, profile, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const unread = useLiveQuery(
    () =>
      user
        ? query(col("messages"), where("toId", "==", user.uid), where("read", "==", false), limit(20))
        : null,
    `unread|${user?.uid}`
  );

  // Searches the list on screen, or the most useful list for the role.
  const search = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = (new FormData(e.currentTarget).get("q") as string).trim();
    const target = pathname.startsWith("/list/") || pathname.startsWith("/fees/")
      ? pathname
      : role === "student" || role === "parent"
      ? "/list/results"
      : role === "finance"
      ? "/fees/payments"
      : "/list/students";
    router.push(`${target}?search=${encodeURIComponent(value)}`);
  };

  const count = unread.data.length;

  return (
    <div className="flex items-center justify-between gap-4 p-4 print:hidden">
      <button
        className="md:hidden bg-white rounded-md w-9 h-9 flex flex-col items-center justify-center gap-[5px] shrink-0"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <span className="block w-5 h-[2px] bg-gray-600 rounded" />
        <span className="block w-5 h-[2px] bg-gray-600 rounded" />
        <span className="block w-5 h-[2px] bg-gray-600 rounded" />
      </button>
      {/* SEARCH BAR */}
      <form
        onSubmit={search}
        className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2"
      >
        <Image src="/search.png" alt="" width={14} height={14} />
        <input
          name="q"
          type="search"
          placeholder="Search..."
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </form>
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <Link
          href="/list/messages"
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center relative"
          aria-label={`Messages${count ? `, ${count} unread` : ""}`}
        >
          <Image src="/message.png" alt="" width={20} height={20} />
          {count > 0 && (
            <span className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
              {count >= 20 ? "20+" : count}
            </span>
          )}
        </Link>
        <Link
          href="/list/announcements"
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center"
          aria-label="Announcements"
        >
          <Image src="/announcement.png" alt="" width={20} height={20} />
        </Link>
        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">{profile?.displayName}</span>
          <span className="text-[10px] text-gray-500 text-right">{role ? ROLE_LABEL[role] : ""}</span>
        </div>
        <Link href="/profile" aria-label="Profile">
          <Image src="/avatar.png" alt="" width={36} height={36} className="rounded-full" />
        </Link>
      </div>
    </div>
  );
};

export default Navbar;
