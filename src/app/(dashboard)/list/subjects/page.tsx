"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import type { Subject } from "@/lib/types";
import { where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";

const SubjectListPage = () => {
  const { role } = useAuth();
  const teacherId = useSearchParams().get("teacherId");

  const columns = [
    { header: "Code", accessor: "code" },
    { header: "Unit Name", accessor: "name" },
    { header: "Credit hours", accessor: "credits", className: "hidden md:table-cell" },
    { header: "Lecturers", accessor: "teachers", className: "hidden md:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: Subject) => (
    <Row key={item.id} archived={item.active === false}>
      <td className="p-4 font-medium whitespace-nowrap">{item.code}</td>
      <td className="p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.creditHours}</td>
      <td className="hidden md:table-cell">{item.teacherNames?.join(", ")}</td>
      {role === "admin" && <RowActions table="subject" item={item} canEdit />}
    </Row>
  );

  return (
    <ListPage<Subject>
      title="All Units"
      collection="subjects"
      columns={columns}
      renderRow={renderRow}
      filters={teacherId ? [where("teacherIds", "array-contains", teacherId)] : []}
      filterKey={`t:${teacherId}`}
      searchable={!teacherId}
      orderField="code"
      actions={role === "admin" && <FormContainer table="subject" type="create" />}
    />
  );
};

export default withSuspense(SubjectListPage);
