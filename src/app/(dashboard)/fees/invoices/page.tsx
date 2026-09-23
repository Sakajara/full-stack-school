"use client";

import ListPage from "@/components/ListPage";
import { Row } from "@/components/rows";
import { Notice, withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { cancelInvoice, issueInvoicesForClass, InvoiceRunResult } from "@/lib/finance-actions";
import { formatKES } from "@/lib/money";
import { useOptions } from "@/lib/options";
import type { FundingScheme, Invoice } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

const IssuePanel = () => {
  const { institution } = useAuth();
  const classes = useOptions("classes");
  const schemes = useOptions<FundingScheme & { id: string }>("fundingSchemes", { label: (s) => s.name });
  const gss = schemes.items.filter((s) => s.appliesTo === "GSS");
  const ssp = schemes.items.filter((s) => s.appliesTo === "SSP");
  const [classId, setClassId] = useState("");
  const [gssId, setGssId] = useState("");
  const [sspId, setSspId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InvoiceRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await issueInvoicesForClass({
        classId,
        gssSchemeId: gssId || gss[0]?.id,
        sspSchemeId: sspId || ssp[0]?.id,
      });
      setResult(r);
      toast(`${r.issued} invoice(s) issued.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const select = "ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-surface";

  return (
    <form onSubmit={run} className="mt-4 bg-lamaSkyLight rounded-md p-4 flex flex-col gap-3">
      <h2 className="font-semibold">
        Issue invoices for {institution?.academicYear}, semester {institution?.semester}
      </h2>
      <p className="text-xs text-gray-500">
        Each active student in the class is billed from the fee structure for their programme, sponsorship and year,
        split between payers by the chosen scheme and their band. Students already invoiced this semester are skipped.
      </p>
      <div className="flex gap-3 flex-wrap">
        <select required className={select} value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
          <option value="">Class...</option>
          {classes.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={select} value={gssId} onChange={(e) => setGssId(e.target.value)} aria-label="Government-sponsored scheme">
          {gss.map((s) => <option key={s.id} value={s.id}>GSS: {s.name}</option>)}
        </select>
        <select className={select} value={sspId} onChange={(e) => setSspId(e.target.value)} aria-label="Self-sponsored scheme">
          {ssp.map((s) => <option key={s.id} value={s.id}>SSP: {s.name}</option>)}
        </select>
        <button disabled={busy || !classId} className="bg-blue-400 text-white py-2 px-4 rounded-md text-sm disabled:opacity-60">
          {busy ? "Issuing..." : "Issue invoices"}
        </button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {result && (
        <div className="text-sm">
          <p>{result.issued} issued, {result.skipped.length} skipped.</p>
          {result.skipped.length > 0 && (
            <ul className="text-xs text-gray-600 list-disc pl-5 mt-1 max-h-40 overflow-y-auto">
              {result.skipped.map((s) => <li key={s.student}>{s.student}: {s.reason}</li>)}
            </ul>
          )}
        </div>
      )}
    </form>
  );
};

const InvoiceListPage = () => {
  const { institution } = useAuth();
  const params = useSearchParams();
  const status = params.get("status") ?? "issued";
  const year = params.get("year") ?? institution?.academicYear;

  const cancel = async (inv: Invoice) => {
    if (!window.confirm(`Cancel invoice ${inv.number} for ${inv.studentName}? The student's balance is reduced by ${formatKES(inv.total)}.`)) return;
    try {
      await cancelInvoice(inv.id);
      toast("Invoice cancelled.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <ListPage<Invoice>
      title="Invoices"
      collection="invoices"
      columns={[
        { header: "Invoice", accessor: "number" },
        { header: "Student", accessor: "student" },
        { header: "Semester", accessor: "sem", className: "hidden md:table-cell" },
        { header: "Split", accessor: "split", className: "hidden lg:table-cell" },
        { header: "Total", accessor: "total" },
        { header: "Actions", accessor: "action" },
      ]}
      renderRow={(inv) => (
        <Row key={inv.id} archived={inv.status === "cancelled"}>
          <td className="p-4 whitespace-nowrap">
            {inv.number}
            <p className="text-xs text-gray-400">{formatDate(inv.issuedAt)}</p>
          </td>
          <td>
            <Link href={`/fees/statement?id=${inv.studentId}`} className="hover:underline">{inv.studentName}</Link>
            <p className="text-xs text-gray-400">{inv.admissionNo}</p>
          </td>
          <td className="hidden md:table-cell">{inv.academicYear} S{inv.semester}</td>
          <td className="hidden lg:table-cell text-xs text-gray-500">
            {inv.fundingBand ? `Band ${inv.fundingBand}: ` : ""}
            {inv.splits.map((s) => `${s.payerName} ${formatKES(s.expected)}`).join(", ")}
          </td>
          <td className="font-medium whitespace-nowrap">{formatKES(inv.total)}</td>
          <td>
            {inv.status === "issued" ? (
              <button className="text-xs underline text-red-500" onClick={() => cancel(inv)}>Cancel</button>
            ) : (
              <span className="text-xs text-gray-400">Cancelled</span>
            )}
          </td>
        </Row>
      )}
      filters={[where("status", "==", status), ...(year ? [where("academicYear", "==", year)] : [])]}
      filterKey={`${status}|${year}`}
      orderField="issuedAt"
      orderDir="desc"
      archivable={false}
      above={<IssuePanel />}
      actions={
        <Link href={`/fees/invoices?status=${status === "issued" ? "cancelled" : "issued"}`} className="text-xs underline text-gray-500">
          {status === "issued" ? "Show cancelled" : "Show issued"}
        </Link>
      }
    />
  );
};

export default withSuspense(InvoiceListPage);
