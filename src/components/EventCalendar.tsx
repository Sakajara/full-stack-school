"use client";

import { isoDate } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const EventCalendar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("date");
  const value = current && !Number.isNaN(new Date(current).getTime()) ? new Date(current) : new Date();

  return (
    <Calendar
      value={value}
      onChange={(v) => {
        if (v instanceof Date) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("date", isoDate(v));
          router.replace(`${pathname}?${params}`, { scroll: false });
        }
      }}
    />
  );
};

export default EventCalendar;
