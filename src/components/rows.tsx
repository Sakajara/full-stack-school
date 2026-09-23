"use client";

import Image from "next/image";
import Link from "next/link";
import FormContainer, { FormTable } from "./FormContainer";

export const Row = ({ children, archived }: { children: React.ReactNode; archived?: boolean }) => (
  <tr
    className={`border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight ${
      archived ? "opacity-50" : ""
    }`}
  >
    {children}
  </tr>
);

export const PersonCell = ({
  img,
  name,
  sub,
}: {
  img?: string | null;
  name: string;
  sub?: string | null;
}) => (
  <td className="flex items-center gap-4 p-4">
    <Image
      src={img || "/noAvatar.png"}
      alt=""
      width={40}
      height={40}
      className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
      unoptimized={!!img}
    />
    <div className="flex flex-col">
      <h3 className="font-semibold">{name}</h3>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  </td>
);

export const ViewButton = ({ href }: { href: string }) => (
  <Link
    href={href}
    className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"
    aria-label="View"
    title="View"
  >
    <Image src="/view.png" alt="" width={16} height={16} />
  </Link>
);

// Edit and archive (or restore, for archived records) buttons.
export const RowActions = ({
  table,
  item,
  canEdit,
  canArchive = canEdit,
  view,
  children,
}: {
  table: FormTable;
  item: { id: string; active?: boolean };
  canEdit: boolean;
  canArchive?: boolean;
  view?: string;
  children?: React.ReactNode;
}) => (
  <td>
    <div className="flex items-center gap-2">
      {view && <ViewButton href={view} />}
      {canEdit && item.active !== false && <FormContainer table={table} type="update" data={item} />}
      {canArchive &&
        (item.active === false ? (
          <FormContainer table={table} type="restore" id={item.id} />
        ) : (
          <FormContainer table={table} type="delete" id={item.id} />
        ))}
      {children}
    </div>
  </td>
);
