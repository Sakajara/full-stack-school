"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { PersonCell, Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import type { Admin } from "@/lib/types";

const StaffListPage = () => {
  const { user } = useAuth();
  return (
    <ListPage<Admin & { role?: string }>
      title="Office Staff"
      collection="admins"
      columns={[
        { header: "Info", accessor: "info" },
        { header: "Username", accessor: "username", className: "hidden md:table-cell" },
        { header: "Role", accessor: "role", className: "hidden md:table-cell" },
        { header: "Actions", accessor: "action" },
      ]}
      renderRow={(item) => (
        <Row key={item.id} archived={item.active === false}>
          <PersonCell name={`${item.name} ${item.surname}`} sub={item.email} />
          <td className="hidden md:table-cell">{item.username}</td>
          <td className="hidden md:table-cell">{item.role === "finance" ? "Finance office" : "Administrator"}</td>
          {/* An administrator cannot archive their own account. */}
          <RowActions table="staff" item={item} canEdit={false} canArchive={item.id !== user?.uid} />
        </Row>
      )}
      filters={[]}
      filterKey=""
      orderField="surname"
      actions={<FormContainer table="staff" type="create" />}
    />
  );
};

export default withSuspense(StaffListPage);
