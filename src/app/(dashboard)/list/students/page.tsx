"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { PersonCell, Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { col, useLiveQuery } from "@/lib/live";
import { firstIds } from "@/lib/scope";
import type { Lesson, Student } from "@/lib/types";
import { query, where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const StudentListPage = () => {
  const { role, user } = useAuth();
  const params = useSearchParams();
  const classId = params.get("classId");
  const parentId = params.get("parentId");
  // Lecturers see the students in their own classes unless they ask for all.
  const teacherId =
    params.get("teacherId") ??
    (role === "teacher" && params.get("all") !== "1" && !parentId ? user?.uid : null);

  const lessons = useLiveQuery<Lesson>(
    () =>
      teacherId && !classId
        ? query(col("lessons"), where("teacherId", "==", teacherId), where("active", "==", true))
        : null,
    `sl|${teacherId}|${classId}`
  );
  const classIds = Array.from(new Set(lessons.data.map((l) => l.classId)));

  const filters = parentId
    ? [where("parentId", "==", parentId)]
    : classId
    ? [where("classId", "==", classId)]
    : teacherId
    ? lessons.loading
      ? null
      : [where("classId", "in", firstIds(classIds))]
    : [];

  const columns = [
    { header: "Info", accessor: "info" },
    { header: "Admission No.", accessor: "studentId", className: "hidden md:table-cell" },
    { header: "Year", accessor: "grade", className: "hidden md:table-cell" },
    { header: "Programme", accessor: "programme", className: "hidden lg:table-cell" },
    { header: "Sponsorship", accessor: "sponsorship", className: "hidden lg:table-cell" },
    { header: "Phone", accessor: "phone", className: "hidden lg:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: Student) => (
    <Row key={item.id} archived={item.active === false}>
      <PersonCell img={item.img} name={`${item.name} ${item.surname}`} sub={item.className} />
      <td className="hidden md:table-cell">{item.admissionNo}</td>
      <td className="hidden md:table-cell">{item.gradeLevel}</td>
      <td className="hidden lg:table-cell">{item.programmeName ?? "-"}</td>
      <td className="hidden lg:table-cell">
        {item.sponsorship}
        {item.fundingBand ? ` (band ${item.fundingBand})` : ""}
        {item.status !== "active" && <span className="ml-1 text-amber-600">{item.status}</span>}
      </td>
      <td className="hidden lg:table-cell">{item.phone}</td>
      <RowActions table="student" item={item} canEdit={false} canArchive={role === "admin"} view={`/list/students/view?id=${item.id}`} />
    </Row>
  );

  return (
    <ListPage<Student>
      title={role === "teacher" && !params.get("all") && !classId ? "My Students" : "All Students"}
      collection="students"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`p:${parentId}|c:${classId}|t:${teacherId}|${classIds.join(",")}`}
      orderField="surname"
      actions={
        <>
          {role === "teacher" && !params.get("all") && (
            <Link href="/list/students?all=1" className="text-xs text-gray-500 underline whitespace-nowrap">
              All students
            </Link>
          )}
          {role === "admin" && <FormContainer table="student" type="create" />}
        </>
      }
    />
  );
};

export default withSuspense(StudentListPage);
