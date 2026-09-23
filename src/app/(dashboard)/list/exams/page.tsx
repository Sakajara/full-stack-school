"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { firstIds, useMyClassIds } from "@/lib/scope";
import type { Exam } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const KIND = { main: "Main", supplementary: "Supplementary", special: "Special" };

const ExamListPage = () => {
  const { role, user } = useAuth();
  const params = useSearchParams();
  const classId = params.get("classId");
  const teacherParam = params.get("teacherId");
  const scope = useMyClassIds();

  // Lecturers see their own exams; students and guardians see their classes'.
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
    { header: "Exam", accessor: "name" },
    { header: "Class", accessor: "class" },
    { header: "Lecturer", accessor: "teacher", className: "hidden md:table-cell" },
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: Exam) => (
    <Row key={item.id} archived={item.active === false}>
      <td className="p-4">
        <span className="font-medium">{item.subjectCode} </span>
        {item.subjectName}
        <p className="text-xs text-gray-400">
          {item.title} ({KIND[item.kind] ?? item.kind}){item.venue ? `, ${item.venue}` : ""}
        </p>
      </td>
      <td>{item.className}</td>
      <td className="hidden md:table-cell">{item.teacherName}</td>
      <td className="hidden md:table-cell">{formatDateTime(item.startTime)}</td>
      <RowActions table="exam" item={item} canEdit={canManage}>
        {canManage && (
          <Link href={`/list/results/sheet?assessment=exam:${item.id}`} className="text-xs underline text-gray-500 whitespace-nowrap">
            Mark sheet
          </Link>
        )}
      </RowActions>
    </Row>
  );

  return (
    <ListPage<Exam>
      title="All Exams"
      collection="exams"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`${role}|c:${classId}|t:${teacherParam}|${scope.ids?.join(",")}`}
      orderField="startTime"
      orderDir="desc"
      actions={canManage && <FormContainer table="exam" type="create" />}
    />
  );
};

export default withSuspense(ExamListPage);
