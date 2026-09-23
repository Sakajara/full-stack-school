"use client";

import FormContainer from "@/components/FormContainer";
import ListPage from "@/components/ListPage";
import { Row } from "@/components/rows";
import { withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { rejectPayment, reversePayment, verifyPayment } from "@/lib/finance-actions";
import { formatKES } from "@/lib/money";
import { ownerFilters } from "@/lib/scope";
import type { Payment } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { where } from "firebase/firestore";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-lamaYellowLight text-amber-700",
  verified: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
  reversed: "bg-gray-100 text-gray-500",
};

const METHOD: Record<string, string> = { MPESA: "M-Pesa", BANK: "Bank", CHEQUE: "Cheque", EFT: "EFT", CASH: "Cash" };

const PaymentListPage = () => {
  const { role, user } = useAuth();
  const params = useSearchParams();
  const pathname = usePathname();
  const office = role === "admin" || role === "finance";
  const status = params.get("status");

  const filters = [
    ...ownerFilters(role, user?.uid),
    ...(status ? [where("status", "==", status)] : []),
  ];

  const act = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      toast(label);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const reason = (what: string) => window.prompt(`Reason to ${what} this payment:`)?.trim();

  return (
    <ListPage<Payment>
      title={office ? "Payments" : "My payments"}
      collection="payments"
      columns={[
        { header: "Reference", accessor: "ref" },
        { header: "Student", accessor: "student", className: office ? "" : "hidden md:table-cell" },
        { header: "Paid by", accessor: "payer", className: "hidden md:table-cell" },
        { header: "Date", accessor: "date", className: "hidden md:table-cell" },
        { header: "Amount", accessor: "amount" },
        { header: "Status", accessor: "status" },
        ...(office ? [{ header: "Actions", accessor: "action" }] : []),
      ]}
      renderRow={(p) => (
        <Row key={p.id}>
          <td className="p-4">
            <span className="font-mono text-xs">{p.reference}</span>
            <p className="text-xs text-gray-400">{METHOD[p.method] ?? p.method}</p>
          </td>
          <td className={office ? "" : "hidden md:table-cell"}>
            <Link href={`/fees/statement?id=${p.studentId}`} className="hover:underline">{p.studentName}</Link>
            <p className="text-xs text-gray-400">{p.admissionNo}</p>
          </td>
          <td className="hidden md:table-cell">{p.payerName}</td>
          <td className="hidden md:table-cell">{formatDate(p.paidOn)}</td>
          <td className="font-medium whitespace-nowrap">{formatKES(p.amount)}</td>
          <td>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[p.status]}`}>{p.status}</span>
            {p.note && <p className="text-[11px] text-gray-400 mt-1">{p.note}</p>}
          </td>
          {office && (
            <td>
              <div className="flex gap-2 text-xs">
                {p.status === "pending" && (
                  <>
                    <button className="underline text-green-700" onClick={() => act("Payment verified.", () => verifyPayment(p.id, user!.uid))}>
                      Verify
                    </button>
                    <button
                      className="underline text-red-500"
                      onClick={() => {
                        const r = reason("reject");
                        if (r) act("Payment rejected.", () => rejectPayment(p.id, user!.uid, r));
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
                {p.status === "verified" && (
                  <button
                    className="underline text-gray-500"
                    onClick={() => {
                      const r = reason("reverse");
                      if (r) act("Payment reversed.", () => reversePayment(p.id, user!.uid, r));
                    }}
                  >
                    Reverse
                  </button>
                )}
              </div>
            </td>
          )}
        </Row>
      )}
      filters={filters}
      filterKey={`${role}|${user?.uid}|${status}`}
      orderField="paidOn"
      orderDir="desc"
      archivable={false}
      searchable={office}
      above={
        office && (
          <div className="flex gap-2 mt-4 text-xs flex-wrap">
            {[null, "pending", "verified", "rejected", "reversed"].map((s) => (
              <Link
                key={s ?? "all"}
                href={s ? `${pathname}?status=${s}` : pathname}
                className={`px-3 py-1 rounded-full ${status === s || (!s && !status) ? "bg-lamaSky" : "bg-slate-100"}`}
              >
                {s ?? "all"}
              </Link>
            ))}
          </div>
        )
      }
      actions={
        office ? (
          <FormContainer table="payment" type="create" />
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            Report a payment <FormContainer table="reportPayment" type="create" />
          </div>
        )
      }
    />
  );
};

export default withSuspense(PaymentListPage);
