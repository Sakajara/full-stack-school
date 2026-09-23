"use client";

import { limit, orderBy, query, QueryConstraint, where } from "firebase/firestore";
import { col, useLiveQuery } from "./live";

type Named = { id: string; name?: string; surname?: string; code?: string; level?: number };

export const personLabel = (p: Named) => `${p.name ?? ""} ${p.surname ?? ""}`.trim();

// Choices for a select box: active records of one collection, live.
export const useOptions = <T extends Named>(
  collectionName: string,
  opts: {
    label?: (item: T) => string;
    filters?: QueryConstraint[];
    filterKey?: string;
    order?: string;
    archivable?: boolean;
    enabled?: boolean;
  } = {}
) => {
  const {
    label = (i: T) => (i.code ? `${i.code} ${i.name ?? ""}` : i.surname ? personLabel(i) : i.name ?? i.id),
    filters = [],
    filterKey = "",
    order = "name",
    archivable = true,
    enabled = true,
  } = opts;
  const live = useLiveQuery<T>(
    () =>
      enabled
        ? query(
            col(collectionName),
            ...filters,
            ...(archivable ? [where("active", "==", true)] : []),
            orderBy(order),
            limit(500)
          )
        : null,
    `opts|${collectionName}|${filterKey}|${order}|${enabled}`
  );
  return {
    items: live.data,
    options: live.data.map((i) => ({ value: i.id, label: label(i) })),
    loading: live.loading,
  };
};
