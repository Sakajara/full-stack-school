"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TableSearch = ({ placeholder = "Search..." }: { placeholder?: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = (new FormData(e.currentTarget).get("search") as string).trim();
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value);
    else params.delete("search");
    // A new search starts from the first page.
    params.delete("page");
    router.push(`${pathname}?${params}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2"
    >
      <Image src="/search.png" alt="" width={14} height={14} />
      <input
        name="search"
        type="search"
        defaultValue={searchParams.get("search") ?? ""}
        placeholder={placeholder}
        className="w-full md:w-[200px] p-2 bg-transparent outline-none"
      />
    </form>
  );
};

export default TableSearch;
