"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import type { Lesson } from "@/lib/types";
import { where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";

const LessonListPage = () => {
  const { role, user } = useAuth();
  const params = useSearchParams();
  const classId = params.get("classId");
  const teacherId = params.get("teacherId") ?? (role === "teacher" && !classId ? user?.uid : null);

  const filters = [
    ...(classId ? [where("classId", "==", classId)] : []),
    ...(teacherId ? [where("teacherId", "==", teacherId)] : []),
  ];

  const columns = [
    { header: "Unit", accessor: "name" },
    { header: "Class", accessor: "class" },
    { header: "When", accessor: "when", className: "hidden md:table-cell" },
    { header: "Venue", accessor: "venue", className: "hidden lg:table-cell" },
    { header: "Lecturer", accessor: "teacher", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: Lesson) => (
    <Row key={item.id} archived={item.active === false}>
      <td className="p-4">
        {item.subjectCode && <span className="font-medium">{item.subjectCode} </span>}
        {item.subjectName}
        <p className="text-xs text-gray-400">{item.name}</p>
      </td>
      <td>{item.className}</td>
      <td className="hidden md:table-cell whitespace-nowrap">
        {item.day[0] + item.day.slice(1, 3).toLowerCase()} {item.startTime}-{item.endTime}
      </td>
      <td className="hidden lg:table-cell">{item.venue || "-"}</td>
      <td className="hidden md:table-cell">{item.teacherName}</td>
      <RowActions table="lesson" item={item} canEdit={role === "admin"} />
    </Row>
  );

  return (
    <ListPage<Lesson>
      title={role === "teacher" && !classId ? "My Timetable" : "Timetable"}
      collection="lessons"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`c:${classId}|t:${teacherId}`}
      orderField="slot"
      actions={role === "admin" && <FormContainer table="lesson" type="create" />}
    />
  );
};

export default withSuspense(LessonListPage);
