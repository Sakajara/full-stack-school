"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { firstIds, useMyClassIds } from "@/lib/scope";
import type { Assignment } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const AssignmentListPage = () => {
  const { role, user } = useAuth();
  const params = useSearchParams();
  const classId = params.get("classId");
  const teacherParam = params.get("teacherId");
  const scope = useMyClassIds();

  const filters =
    classId
      ? [where("classId", "==", classId)]
      : teacherParam
      ? [where("teacherId", "==", teacherParam)]
      : role === "teacher"
      ? [where("teacherId", "==", user?.uid ?? "")]
      : role === "student" || role === "parent"
      ? scope.loading
        ? null
        : [where("classId", "in", firstIds(scope.ids ?? []))]
      : [];

  const canManage = role === "admin" || role === "teacher";

  const columns = [
    { header: "Assessment", accessor: "name" },
    { header: "Class", accessor: "class" },
    { header: "Lecturer", accessor: "teacher", className: "hidden md:table-cell" },
    { header: "Due Date", accessor: "dueDate", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: Assignment) => (
    <Row key={item.id} archived={item.active === false}>
      <td className="p-4">
        <span className="font-medium">{item.subjectCode} </span>
        {item.subjectName}
        <p className="text-xs text-gray-400">
          {item.title} ({item.kind === "cat" ? "CAT" : "Assignment"}, out of {item.maxScore})
        </p>
      </td>
      <td>{item.className}</td>
      <td className="hidden md:table-cell">{item.teacherName}</td>
      <td className="hidden md:table-cell">{formatDate(item.dueDate)}</td>
      <RowActions table="assignment" item={item} canEdit={canManage}>
        {canManage && (
          <Link
            href={`/list/results/sheet?assessment=assignment:${item.id}`}
            className="text-xs underline text-gray-500 whitespace-nowrap"
          >
            Mark sheet
          </Link>
        )}
      </RowActions>
    </Row>
  );

  return (
    <ListPage<Assignment>
      title="CATs and Assignments"
      collection="assignments"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`${role}|c:${classId}|t:${teacherParam}|${scope.ids?.join(",")}`}
      orderField="dueDate"
      orderDir="desc"
      actions={canManage && <FormContainer table="assignment" type="create" />}
    />
  );
};

export default withSuspense(AssignmentListPage);
