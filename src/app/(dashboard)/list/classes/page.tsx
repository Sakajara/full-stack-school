"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import type { SchoolClass } from "@/lib/types";
import { where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ClassListPage = () => {
  const { role } = useAuth();
  const supervisorId = useSearchParams().get("supervisorId");

  const columns = [
    { header: "Class Name", accessor: "name" },
    { header: "Students", accessor: "capacity", className: "hidden md:table-cell" },
    { header: "Year", accessor: "grade", className: "hidden md:table-cell" },
    { header: "Programme", accessor: "programme", className: "hidden lg:table-cell" },
    { header: "Class adviser", accessor: "supervisor", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: SchoolClass) => (
    <Row key={item.id} archived={item.active === false}>
      <td className="p-4">
        <Link href={`/list/students?classId=${item.id}`} className="font-medium hover:underline">
          {item.name}
        </Link>
        {item.intake && <p className="text-xs text-gray-400">{item.intake}</p>}
      </td>
      <td className="hidden md:table-cell">
        {item.studentCount ?? 0}/{item.capacity}
      </td>
      <td className="hidden md:table-cell">{item.gradeLevel}</td>
      <td className="hidden lg:table-cell">{item.programmeName ?? "-"}</td>
      <td className="hidden md:table-cell">{item.supervisorName ?? "-"}</td>
      <RowActions table="class" item={item} canEdit={role === "admin"}>
        <Link href={`/list/lessons?classId=${item.id}`} className="text-xs underline text-gray-500">
          Timetable
        </Link>
      </RowActions>
    </Row>
  );

  return (
    <ListPage<SchoolClass>
      title="All Classes"
      collection="classes"
      columns={columns}
      renderRow={renderRow}
      filters={supervisorId ? [where("supervisorId", "==", supervisorId)] : []}
      filterKey={`s:${supervisorId}`}
      orderField="name"
      actions={role === "admin" && <FormContainer table="class" type="create" />}
    />
  );
};

export default withSuspense(ClassListPage);
