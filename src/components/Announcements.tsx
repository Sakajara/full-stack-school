"use client";

import { col, useLiveQuery } from "@/lib/live";
import { firstIds, useMyClassIds } from "@/lib/scope";
import type { Announcement } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { and, limit, or, orderBy, query, where } from "firebase/firestore";
import Link from "next/link";

const COLORS = ["bg-lamaSkyLight", "bg-lamaPurpleLight", "bg-lamaYellowLight"];

const Announcements = () => {
  const scope = useMyClassIds();

  // Everyone sees institution-wide announcements (no class) plus those for
  // their own classes. Office staff see all.
  const { data } = useLiveQuery<Announcement>(
    () =>
      scope.loading
        ? null
        : scope.ids === null
        ? query(col("announcements"), where("active", "==", true), orderBy("date", "desc"), limit(3))
        : query(
            col("announcements"),
            and(
              where("active", "==", true),
              or(where("classId", "==", null), where("classId", "in", firstIds(scope.ids)))
            ),
            orderBy("date", "desc"),
            limit(3)
          ),
    `ann|${scope.loading}|${scope.ids?.join(",")}`
  );

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <Link href="/list/announcements" className="text-xs text-gray-400">
          View All
        </Link>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {data.length === 0 && <p className="text-sm text-gray-400">No announcements.</p>}
        {data.map((a, i) => (
          <div className={`${COLORS[i % 3]} rounded-md p-4`} key={a.id}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{a.title}</h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1 whitespace-nowrap">
                {formatDate(a.date)}
              </span>
            </div>
            {a.className && <p className="text-[11px] text-gray-500">{a.className}</p>}
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{a.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;
