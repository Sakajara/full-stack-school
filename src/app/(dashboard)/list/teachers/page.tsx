"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { PersonCell, Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { col, useLiveQuery } from "@/lib/live";
import type { Lesson, Teacher } from "@/lib/types";
import { documentId, query, where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";

const TeacherListPage = () => {
  const { role } = useAuth();
  const params = useSearchParams();
  const classId = params.get("classId");

  // "Lecturers of this class" goes through the timetable.
  const lessons = useLiveQuery<Lesson>(
    () => (classId ? query(col("lessons"), where("classId", "==", classId), where("active", "==", true)) : null),
    `tl|${classId}`
  );
  const teacherIds = Array.from(new Set(lessons.data.map((l) => l.teacherId))).slice(0, 30);
  const filters = classId
    ? lessons.loading
      ? null
      : [where(documentId(), "in", teacherIds.length ? teacherIds : ["-none-"])]
    : [];

  const columns = [
    { header: "Info", accessor: "info" },
    { header: "Staff No.", accessor: "teacherId", className: "hidden md:table-cell" },
    { header: "Units", accessor: "subjects", className: "hidden md:table-cell" },
    { header: "Department", accessor: "department", className: "hidden md:table-cell" },
    { header: "Phone", accessor: "phone", className: "hidden lg:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: Teacher) => (
    <Row key={item.id} archived={item.active === false}>
      <PersonCell img={item.img} name={`${item.name} ${item.surname}`} sub={item.email} />
      <td className="hidden md:table-cell">{item.staffNo || item.username}</td>
      <td className="hidden md:table-cell">{item.subjectNames?.join(", ")}</td>
      <td className="hidden md:table-cell">{item.departmentName ?? "-"}</td>
      <td className="hidden lg:table-cell">{item.phone}</td>
      <RowActions table="teacher" item={item} canEdit={false} canArchive={role === "admin"} view={`/list/teachers/view?id=${item.id}`} />
    </Row>
  );

  return (
    <ListPage<Teacher>
      title="All Lecturers"
      collection="teachers"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`class:${classId}|${teacherIds.join(",")}`}
      orderField="surname"
      actions={role === "admin" && <FormContainer table="teacher" type="create" />}
    />
  );
};

export default withSuspense(TeacherListPage);
