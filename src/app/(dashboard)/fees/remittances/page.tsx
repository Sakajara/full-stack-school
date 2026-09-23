"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { formatKES } from "@/lib/money";
import type { Remittance } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const RemittanceListPage = () => (
  <ListPage<Remittance>
    title="HELB, Universities Fund and bursary transfers"
    collection="remittances"
    columns={[
      { header: "From", accessor: "payer" },
      { header: "Reference", accessor: "ref", className: "hidden md:table-cell" },
      { header: "Received", accessor: "date", className: "hidden md:table-cell" },
      { header: "Students", accessor: "students", className: "hidden md:table-cell" },
      { header: "Amount", accessor: "amount" },
      { header: "Unallocated", accessor: "left" },
    ]}
    renderRow={(r) => (
      <Row key={r.id}>
        <td className="p-4">
          {r.payerName}
          <p className="text-xs text-gray-400">{r.academicYear} S{r.semester}</p>
        </td>
        <td className="hidden md:table-cell font-mono text-xs">{r.reference}</td>
        <td className="hidden md:table-cell">{formatDate(r.receivedOn)}</td>
        <td className="hidden md:table-cell">{r.allocations.length}</td>
        <td className="font-medium whitespace-nowrap">{formatKES(r.total)}</td>
        <td className={r.total - r.allocated > 0 ? "text-amber-600" : "text-gray-400"}>{formatKES(r.total - r.allocated)}</td>
      </Row>
    )}
    filters={[]}
    filterKey=""
    orderField="receivedOn"
    orderDir="desc"
    archivable={false}
    searchable={false}
    actions={<FormContainer table="remittance" type="create" />}
  />
);

export default withSuspense(RemittanceListPage);
