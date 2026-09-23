"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { firstIds, useMyClassIds } from "@/lib/scope";
import type { Announcement } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { or, where } from "firebase/firestore";

const AnnouncementListPage = () => {
  const { role } = useAuth();
  const scope = useMyClassIds();

  // Institution-wide announcements plus those for the viewer's classes.
  const filters = scope.loading
    ? null
    : scope.ids === null
    ? []
    : [or(where("classId", "==", null), where("classId", "in", firstIds(scope.ids)))];

  const columns = [
    { header: "Title", accessor: "title" },
    { header: "Class", accessor: "class" },
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: Announcement) => (
    <Row key={item.id} archived={item.active === false}>
      <td className="p-4">
        {item.title}
        <p className="text-xs text-gray-400 whitespace-pre-line">{item.description}</p>
      </td>
      <td>{item.className || "Everyone"}</td>
      <td className="hidden md:table-cell">{formatDate(item.date)}</td>
      {role === "admin" && <RowActions table="announcement" item={item} canEdit />}
    </Row>
  );

  return (
    <ListPage<Announcement>
      title="All Announcements"
      collection="announcements"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`${scope.ids?.join(",")}`}
      orderField="date"
      orderDir="desc"
      actions={role === "admin" && <FormContainer table="announcement" type="create" />}
    />
  );
};

export default withSuspense(AnnouncementListPage);
