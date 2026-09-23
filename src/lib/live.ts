"use client";

import {
  and,
  collection,
  doc,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  Query,
  QueryCompositeFilterConstraint,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryFilterConstraint,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { firebase } from "./firebase";
import { searchTerm } from "./search";
import { ITEM_PER_PAGE } from "./settings";

type Live<T> = { data: T; loading: boolean; error: string | null };

const describe = (e: unknown) => {
  const code = (e as { code?: string })?.code;
  // Firestore's message for a missing index includes a link that creates it.
  if (code === "failed-precondition") console.warn(e);
  if (code === "permission-denied") return "You do not have access to this information.";
  if (code === "failed-precondition")
    return "This view needs a database index. Deploy firestore.indexes.json.";
  if (code === "unavailable") return "Offline. Showing saved data where available.";
  return (e as Error)?.message ?? "Something went wrong.";
};

// A single document, kept up to date as it changes.
export const useLiveDoc = <T>(path: string | null): Live<T | null> => {
  const [state, setState] = useState<Live<T | null>>({ data: null, loading: !!path, error: null });
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      doc(firebase().db, path),
      (snap) =>
        setState({
          data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null,
          loading: false,
          error: null,
        }),
      (e) => setState({ data: null, loading: false, error: describe(e) })
    );
  }, [path]);
  return state;
};

// A query, kept up to date. `key` must change whenever the query changes,
// because Query objects are not comparable between renders.
export const useLiveQuery = <T>(build: () => Query | null, key: string): Live<T[]> => {
  const [state, setState] = useState<Live<T[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    const q = build();
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) =>
        setState({
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
          loading: false,
          error: null,
        }),
      (e) => setState({ data: [], loading: false, error: describe(e) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
};

export const col = (name: string) => collection(firebase().db, name);

// Counting uses an aggregation query, which costs one read per 1,000
// matching records instead of one per record.
export const useCount = (build: () => Query | null, key: string) => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const q = build();
    if (!q) return;
    let cancelled = false;
    getCountFromServer(q)
      .then((r) => !cancelled && setCount(r.data().count))
      .catch(() => !cancelled && setCount(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return count;
};

type Filter = QueryFieldFilterConstraint | QueryCompositeFilterConstraint;

// Firestore accepts an or() filter only as the single top-level filter, so
// when one is present every filter is wrapped in one and().
export const combine = (filters: (Filter | QueryConstraint)[]): (QueryConstraint | QueryFilterConstraint)[] => {
  const composite = filters.some((f) => f.type === "or" || f.type === "and");
  if (!composite) return filters as QueryConstraint[];
  return [and(...(filters as Filter[]))];
};

export type ListOptions = {
  collection: string;
  // Role and URL filters; may include one or() filter.
  filters: (QueryConstraint | Filter)[];
  filterKey: string;
  orderField: string;
  orderDir?: "asc" | "desc";
  search?: string | null;
  page: number;
  includeArchived?: boolean;
  // Collections without an `active` flag (results, payments).
  archivable?: boolean;
};

// A paged, searchable, live list. Pages load cumulatively (page 3 keeps
// pages 1-2 cached), so moving back and forth costs no extra reads.
export const useLiveList = <T>(o: ListOptions) => {
  const term = searchTerm(o.search);
  const constraints: (QueryConstraint | Filter)[] = [...o.filters];
  if (o.archivable !== false && !o.includeArchived) constraints.push(where("active", "==", true));
  if (term) constraints.push(where("keywords", "array-contains", term));
  const key = `${o.filterKey}|${term}|${o.includeArchived}|${o.orderField}|${o.orderDir}`;
  const page = Number.isFinite(o.page) && o.page > 0 ? Math.floor(o.page) : 1;

  const list = useLiveQuery<T>(
    () =>
      query(
        col(o.collection),
        ...(combine(constraints) as QueryConstraint[]),
        orderBy(o.orderField, o.orderDir ?? "asc"),
        limit(page * ITEM_PER_PAGE)
      ),
    `${o.collection}|${key}|${page}`
  );
  // Recount whenever the live list grows or shrinks.
  const count = useCount(
    () => query(col(o.collection), ...(combine(constraints) as QueryConstraint[])),
    `${o.collection}|${key}|${list.data.length}`
  );

  return {
    rows: list.data.slice((page - 1) * ITEM_PER_PAGE, page * ITEM_PER_PAGE),
    loading: list.loading,
    error: list.error,
    count: count ?? list.data.length,
    page,
  };
};
