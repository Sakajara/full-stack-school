"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import type { Department } from "@/lib/types";
import { where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const DepartmentListPage = () => {
  const facultyId = useSearchParams().get("facultyId");
  return (
    <ListPage<Department>
      title="Departments"
      collection="departments"
      columns={[
        { header: "Code", accessor: "code" },
        { header: "Name", accessor: "name" },
        { header: "Faculty", accessor: "faculty", className: "hidden md:table-cell" },
        { header: "Actions", accessor: "action" },
      ]}
      renderRow={(item) => (
        <Row key={item.id} archived={item.active === false}>
          <td className="p-4 font-medium">{item.code}</td>
          <td>
            <Link href={`/list/programmes?departmentId=${item.id}`} className="hover:underline">{item.name}</Link>
          </td>
          <td className="hidden md:table-cell">{item.facultyName}</td>
          <RowActions table="department" item={item} canEdit />
        </Row>
      )}
      filters={facultyId ? [where("facultyId", "==", facultyId)] : []}
      filterKey={`f:${facultyId}`}
      orderField="name"
      actions={<FormContainer table="department" type="create" />}
    />
  );
};

export default withSuspense(DepartmentListPage);
