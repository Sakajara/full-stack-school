"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { PersonCell, Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import type { Parent } from "@/lib/types";
import Link from "next/link";

const ParentListPage = () => {
  const { role } = useAuth();

  const columns = [
    { header: "Info", accessor: "info" },
    { header: "Relationship", accessor: "relationship", className: "hidden md:table-cell" },
    { header: "Phone", accessor: "phone", className: "hidden md:table-cell" },
    { header: "Students", accessor: "students", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: Parent) => (
    <Row key={item.id} archived={item.active === false}>
      <PersonCell name={`${item.name} ${item.surname}`} sub={item.email} />
      <td className="hidden md:table-cell">{item.relationship || "-"}</td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">
        <Link href={`/list/students?parentId=${item.id}`} className="underline text-gray-500">
          View
        </Link>
      </td>
      <RowActions table="parent" item={item} canEdit={role === "admin"} />
    </Row>
  );

  return (
    <ListPage<Parent>
      title="All Guardians"
      collection="parents"
      columns={columns}
      renderRow={renderRow}
      filters={[]}
      filterKey=""
      orderField="surname"
      actions={role === "admin" && <FormContainer table="parent" type="create" />}
    />
  );
};

export default withSuspense(ParentListPage);
