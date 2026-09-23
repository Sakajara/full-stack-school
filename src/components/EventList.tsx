"use client";

import { col, useLiveQuery } from "@/lib/live";
import { useMyClassIds } from "@/lib/scope";
import type { SchoolEvent } from "@/lib/types";
import { orderBy, query, Timestamp, where } from "firebase/firestore";

const EventList = ({ dateParam }: { dateParam: string | undefined | null }) => {
  const parsed = dateParam ? new Date(dateParam) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const scope = useMyClassIds();

  const { data } = useLiveQuery<SchoolEvent>(
    () =>
      query(
        col("events"),
        where("active", "==", true),
        where("startTime", ">=", Timestamp.fromDate(start)),
        where("startTime", "<=", Timestamp.fromDate(end)),
        orderBy("startTime")
      ),
    `events|${start.toISOString()}`
  );

  // A day has few events, so the class filter runs here rather than in the query.
  const visible = data.filter((e) => scope.ids === null || !e.classId || scope.ids.includes(e.classId));

  if (!visible.length) return <p className="text-sm text-gray-400">No events on this day.</p>;

  return (
    <>
      {visible.map((event) => (
        <div
          className="p-5 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple"
          key={event.id}
        >
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-gray-600">{event.title}</h1>
            <span className="text-gray-300 text-xs">
              {event.startTime.toDate().toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
          </div>
          {event.className && <p className="text-[11px] text-gray-400">{event.className}</p>}
          <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
        </div>
      ))}
    </>
  );
};

export default EventList;
