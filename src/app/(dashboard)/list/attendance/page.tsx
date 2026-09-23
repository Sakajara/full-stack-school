"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { ownerFilters } from "@/lib/scope";
import type { Attendance } from "@/lib/types";
import { where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";

const AttendanceListPage = () => {
  const { role, user } = useAuth();
  const params = useSearchParams();
  const studentId = params.get("studentId");
  const lessonId = params.get("lessonId");

  const filters = [
    ...ownerFilters(role, user?.uid, { teacherScoped: true }),
    ...(studentId && role !== "student" ? [where("studentId", "==", studentId)] : []),
    ...(lessonId ? [where("lessonId", "==", lessonId)] : []),
  ];

  const columns = [
    { header: "Date", accessor: "date" },
    { header: "Student", accessor: "student" },
    { header: "Unit", accessor: "unit", className: "hidden md:table-cell" },
    { header: "Status", accessor: "status" },
  ];

  const renderRow = (item: Attendance) => (
    <Row key={item.id}>
      <td className="p-4 whitespace-nowrap">{item.date}</td>
      <td>{item.studentName}</td>
      <td className="hidden md:table-cell">{item.subjectName}</td>
      <td className={item.present ? "text-green-600" : "text-red-500"}>{item.present ? "Present" : "Absent"}</td>
    </Row>
  );

  return (
    <ListPage<Attendance>
      title="Attendance"
      collection="attendance"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`${role}|${user?.uid}|s:${studentId}|l:${lessonId}`}
      orderField="date"
      orderDir="desc"
      archivable={false}
      searchable={false}
      empty={role === "teacher" ? "No attendance yet. Use Take attendance to open a class register." : undefined}
      actions={(role === "admin" || role === "teacher") && <FormContainer table="attendance" type="create" />}
    />
  );
};

export default withSuspense(AttendanceListPage);
