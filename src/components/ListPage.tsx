"use client";

import { useAuth } from "@/lib/auth-context";
import { useLiveList } from "@/lib/live";
import { QueryCompositeFilterConstraint, QueryConstraint } from "firebase/firestore";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import Table from "./Table";
import TableSearch from "./TableSearch";
import { Notice } from "./ui/Page";

type Column = { header: string; accessor: string; className?: string };

// One list screen: title, search, filters, live table and pagination.
// Pages supply the collection, columns, row renderer and the filters for
// the viewer's role (null while those filters are still being worked out).
const ListPage = <T,>({
  title,
  collection,
  columns,
  renderRow,
  filters,
  filterKey,
  orderField,
  orderDir,
  actions,
  archivable = true,
  searchable = true,
  empty,
  above,
}: {
  title: string;
  collection: string;
  columns: Column[];
  renderRow: (item: T) => React.ReactNode;
  filters: (QueryConstraint | QueryCompositeFilterConstraint)[] | null;
  filterKey: string;
  orderField: string;
  orderDir?: "asc" | "desc";
  actions?: React.ReactNode;
  archivable?: boolean;
  searchable?: boolean;
  empty?: string;
  above?: React.ReactNode;
}) => {
  const { role } = useAuth();
  const params = useSearchParams();
  const pathname = usePathname();
  const showArchived = archivable && role === "admin" && params.get("archived") === "1";

  const list = useLiveList<T>({
    collection,
    filters: filters ?? [],
    filterKey: `${filterKey}|${filters === null}`,
    orderField,
    orderDir,
    search: searchable ? params.get("search") : null,
    page: Number(params.get("page") ?? "1"),
    includeArchived: showArchived,
    archivable,
  });

  const toggle = new URLSearchParams(params.toString());
  if (showArchived) toggle.delete("archived");
  else toggle.set("archived", "1");
  toggle.delete("page");

  const filtered = Array.from(params.keys()).some((k) => !["page", "search", "archived"].includes(k));

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {searchable && <TableSearch />}
          <div className="flex items-center gap-4 self-end">
            {filtered && (
              <Link href={pathname} className="text-xs text-gray-500 underline">
                Clear filters
              </Link>
            )}
            {archivable && role === "admin" && (
              <Link href={`${pathname}?${toggle}`} className="text-xs text-gray-500 underline whitespace-nowrap">
                {showArchived ? "Hide archived" : "Show archived"}
              </Link>
            )}
            {actions}
          </div>
        </div>
      </div>
      {above}
      {list.error && (
        <div className="mt-4">
          <Notice tone="error">{list.error}</Notice>
        </div>
      )}
      {/* LIST */}
      {list.loading && !list.rows.length ? (
        <p className="p-8 text-center text-sm text-gray-400">Loading...</p>
      ) : (
        <Table columns={columns} renderRow={renderRow} data={list.rows} empty={empty} />
      )}
      {/* PAGINATION */}
      <Pagination page={list.page} count={list.count} />
    </div>
  );
};

export default ListPage;
