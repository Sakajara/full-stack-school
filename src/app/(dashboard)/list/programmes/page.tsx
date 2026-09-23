"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import type { Programme } from "@/lib/types";
import { where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ProgrammeListPage = () => {
  const departmentId = useSearchParams().get("departmentId");
  return (
    <ListPage<Programme>
      title="Programmes"
      collection="programmes"
      columns={[
        { header: "Code", accessor: "code" },
        { header: "Name", accessor: "name" },
        { header: "Level", accessor: "level", className: "hidden md:table-cell" },
        { header: "Duration", accessor: "duration", className: "hidden md:table-cell" },
        { header: "Department", accessor: "department", className: "hidden lg:table-cell" },
        { header: "Actions", accessor: "action" },
      ]}
      renderRow={(item) => (
        <Row key={item.id} archived={item.active === false}>
          <td className="p-4 font-medium">{item.code}</td>
          <td>{item.name}</td>
          <td className="hidden md:table-cell capitalize">{item.level === "phd" ? "PhD" : item.level}</td>
          <td className="hidden md:table-cell">
            {item.durationYears} yrs, {item.semestersPerYear} sem/yr
          </td>
          <td className="hidden lg:table-cell">{item.departmentName}</td>
          <RowActions table="programme" item={item} canEdit>
            <Link href={`/fees/structures?programmeId=${item.id}`} className="text-xs underline text-gray-500">
              Fees
            </Link>
          </RowActions>
        </Row>
      )}
      filters={departmentId ? [where("departmentId", "==", departmentId)] : []}
      filterKey={`d:${departmentId}`}
      orderField="name"
      actions={<FormContainer table="programme" type="create" />}
    />
  );
};

export default withSuspense(ProgrammeListPage);
