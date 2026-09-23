"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { firstIds, useMyClassIds } from "@/lib/scope";
import type { SchoolEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { or, where } from "firebase/firestore";

const EventListPage = () => {
  const { role } = useAuth();
  const scope = useMyClassIds();

  // Institution-wide events plus those for the viewer's classes.
  const filters = scope.loading
    ? null
    : scope.ids === null
    ? []
    : [or(where("classId", "==", null), where("classId", "in", firstIds(scope.ids)))];

  const columns = [
    { header: "Title", accessor: "title" },
    { header: "Class", accessor: "class" },
    { header: "Starts", accessor: "date", className: "hidden md:table-cell" },
    { header: "Ends", accessor: "end", className: "hidden md:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: SchoolEvent) => (
    <Row key={item.id} archived={item.active === false}>
      <td className="p-4">
        {item.title}
        <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
      </td>
      <td>{item.className || "Everyone"}</td>
      <td className="hidden md:table-cell">{formatDateTime(item.startTime)}</td>
      <td className="hidden md:table-cell">{formatDateTime(item.endTime)}</td>
      {role === "admin" && <RowActions table="event" item={item} canEdit />}
    </Row>
  );

  return (
    <ListPage<SchoolEvent>
      title="All Events"
      collection="events"
      columns={columns}
      renderRow={renderRow}
      filters={filters}
      filterKey={`${scope.ids?.join(",")}`}
      orderField="startTime"
      orderDir="desc"
      actions={role === "admin" && <FormContainer table="event" type="create" />}
    />
  );
};

export default withSuspense(EventListPage);
