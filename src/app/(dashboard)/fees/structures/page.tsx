"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row, RowActions } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { formatKES } from "@/lib/money";
import type { FeeStructure } from "@/lib/types";
import { where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";

const FeeStructureListPage = () => {
  const { role, institution } = useAuth();
  const params = useSearchParams();
  const programmeId = params.get("programmeId");
  const year = params.get("year") ?? institution?.academicYear ?? null;
  const office = role === "admin" || role === "finance";

  const filters = [
    ...(programmeId ? [where("programmeId", "==", programmeId)] : []),
    ...(year ? [where("academicYear", "==", year)] : []),
  ];

  return (
    <ListPage<FeeStructure>
      title={`Fee structures${year ? `, ${year}` : ""}`}
      collection="feeStructures"
      columns={[
        { header: "Programme", accessor: "programme" },
        { header: "Sponsorship", accessor: "sponsorship", className: "hidden md:table-cell" },
        { header: "Year / Semester", accessor: "ys" },
        { header: "Items", accessor: "items", className: "hidden lg:table-cell" },
        { header: "Total", accessor: "total" },
        ...(office ? [{ header: "Actions", accessor: "action" }] : []),
      ]}
      renderRow={(item) => (
        <Row key={item.id} archived={item.active === false}>
          <td className="p-4">{item.programmeName}</td>
          <td className="hidden md:table-cell">{item.sponsorship === "GSS" ? "Government" : "Self-sponsored"}</td>
          <td>
            Y{item.gradeLevel} S{item.semester}
          </td>
          <td className="hidden lg:table-cell text-xs text-gray-500">
            {item.items.map((i) => `${i.name} ${formatKES(i.amount)}`).join(", ")}
          </td>
          <td className="font-medium whitespace-nowrap">{formatKES(item.total)}</td>
          {office && <RowActions table="feeStructure" item={item} canEdit />}
        </Row>
      )}
      filters={filters}
      filterKey={`p:${programmeId}|y:${year}`}
      orderField="programmeName"
      searchable={false}
      actions={office && <FormContainer table="feeStructure" type="create" />}
    />
  );
};

export default withSuspense(FeeStructureListPage);
