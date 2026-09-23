"use client";

import { useSearchParams } from "next/navigation";
import EventCalendar from "./EventCalendar";
import EventList from "./EventList";
import Link from "next/link";

const EventCalendarContainer = () => {
  const date = useSearchParams().get("date");
  return (
    <div className="bg-surface p-4 rounded-md">
      <EventCalendar />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">Events</h1>
        <Link href="/list/events" className="text-xs text-gray-400">
          View All
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <EventList dateParam={date} />
      </div>
    </div>
  );
};

export default EventCalendarContainer;
