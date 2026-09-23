"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Page numbers shown: first, last, and two either side of the current page.
const pageWindow = (page: number, pages: number) => {
  const out: (number | "...")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) out.push(i);
    else if (out[out.length - 1] !== "...") out.push("...");
  }
  return out;
};

const Pagination = ({ page, count }: { page: number; count: number }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pages = Math.max(1, Math.ceil(count / ITEM_PER_PAGE));
  const hasPrev = page > 1;
  const hasNext = page < pages;

  const changePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params}`);
  };

  return (
    <div className="p-4 flex items-center justify-between text-gray-500">
      <button
        disabled={!hasPrev}
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => changePage(page - 1)}
      >
        Prev
      </button>
      <div className="flex items-center gap-2 text-sm">
        {pageWindow(page, pages).map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`}>...</span>
          ) : (
            <button
              key={p}
              className={`px-2 rounded-sm ${page === p ? "bg-lamaSky" : ""}`}
              aria-current={page === p ? "page" : undefined}
              onClick={() => changePage(p)}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!hasNext}
        onClick={() => changePage(page + 1)}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
