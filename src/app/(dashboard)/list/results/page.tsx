"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { letterGrade } from "@/lib/grading";
import { ownerFilters } from "@/lib/scope";
import type { Result } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";

const KIND: Record<string, string> = {
  cat: "CAT",
  assignment: "Assignment",
  main: "Exam",
  supplementary: "Supplementary",
  special: "Special exam",
};

const ResultListPage = () => {
  const { role, user } = useAuth();
  const params = useSearchParams();
  const studentId = params.get("studentId");

  // The rules only allow each role to read its own marks, so the role
  // filter always applies and URL filters narrow it further.
  const filters = [
    ...ownerFilters(role, user?.uid, { teacherScoped: true }),
    ...(studentId && role !== "student" ? [where("studentId", "==", studentId)] : []),
  ];

  const canManage = role === "admin" || role === "teacher";

  const columns = [
    { header: "Title", accessor: "title" },
    { header: "Student", accessor: "student" },
    { header: "Score", accessor: "score", className: "hidden md:table-cell" },
    { header: "Lecturer", accessor: "teacher", className: "hidden md:table-cell" },
    { header: "Class", accessor: "class", className: "hidden md:table-cell" },
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    ...(canManage ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: Result) => {
    const pct = (item.score / item.maxScore) * 100;
    return (
      <Row key={item.id}>
        <td className="p-4">
          <span className="font-medium">{item.subjectCode} </span>
          {item.assessmentTitle}
          <p className="text-xs text-gray-400">{KIND[item.assessmentKind] ?? item.assessmentKind}</p>
        </td>
        <td>
          {item.studentName}
          <p className="text-xs text-gray-400">{item.admissionNo}</p>
        </td>
        <td className="hidden md:table-cell whitespace-nowrap">
          {item.score}/{item.maxScore}{" "}
          <span className={pct < 40 ? "text-red-500" : "text-gray-400"}>({letterGrade(pct)})</span>
        </td>
        <td className="hidden md:table-cell">{item.teacherName}</td>
        <td className="hidden md:table-cell">{item.className}</td>
        <td className="hidden md:table-cell">{formatDate(item.date)}</td>
        {canManage && <RowActions table="result" item={{ ...item, active: true }} canEdit canArchive={false} />}
      </Row>
    );
  };

  return (
    <ListPage<Result>
      title={role === "student" ? "My Results" : "All Results"}
      collection="results"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`${role}|${user?.uid}|s:${studentId}`}
      orderField="date"
      orderDir="desc"
      archivable={false}
      actions={canManage && <FormContainer table="result" type="create" />}
    />
  );
};

export default withSuspense(ResultListPage);
