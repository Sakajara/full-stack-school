"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import type { Faculty } from "@/lib/types";
import Link from "next/link";

const FacultyListPage = () => (
  <ListPage<Faculty>
    title="Faculties and Schools"
    collection="faculties"
    columns={[
      { header: "Code", accessor: "code" },
      { header: "Name", accessor: "name" },
      { header: "Actions", accessor: "action" },
    ]}
    renderRow={(item) => (
      <Row key={item.id} archived={item.active === false}>
        <td className="p-4 font-medium">{item.code}</td>
        <td>
          <Link href={`/list/departments?facultyId=${item.id}`} className="hover:underline">{item.name}</Link>
        </td>
        <RowActions table="faculty" item={item} canEdit />
      </Row>
    )}
    filters={[]}
    filterKey=""
    orderField="name"
    actions={<FormContainer table="faculty" type="create" />}
  />
);

export default withSuspense(FacultyListPage);
