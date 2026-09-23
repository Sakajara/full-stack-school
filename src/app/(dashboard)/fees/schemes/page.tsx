"use client";

import { Notice, withSuspense } from "@/components/ui/Page";
import { saveFundingScheme, savePayer } from "@/lib/finance-actions";
import { shareTotal } from "@/lib/funding";
import { col, useLiveQuery } from "@/lib/live";
import { formatKES } from "@/lib/money";
import type { FundingBand, FundingScheme, Payer } from "@/lib/types";
import { orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const input = "ring-[1.5px] ring-gray-300 p-1 rounded-md text-sm";

const SchemeEditor = ({ scheme, payers, onDone }: { scheme: FundingScheme; payers: Payer[]; onDone?: () => void }) => {
  const [s, setS] = useState<FundingScheme>(scheme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setS(scheme), [scheme]);

  // Columns: payers in use by this scheme plus every active payer.
  const used = new Set(s.bands.flatMap((b) => Object.keys(b.shares)));
  const keys = [
    ...payers.filter((p) => p.active || used.has(p.key)).map((p) => p.key),
    ...Array.from(used).filter((k) => !payers.some((p) => p.key === k)),
  ];
  const name = (k: string) => payers.find((p) => p.key === k)?.name ?? k;

  const setBand = (i: number, patch: Partial<FundingBand>) =>
    setS((x) => ({ ...x, bands: x.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const cleaned = {
        ...s,
        bands: s.bands.map((b) => ({
          ...b,
          shares: Object.fromEntries(Object.entries(b.shares).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])),
        })),
      };
      await saveFundingScheme(cleaned);
      toast("Funding scheme saved!");
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface p-4 rounded-md flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <span className="text-xs text-gray-500">Name</span>
          <input className={input} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Applies to</span>
          <select className={input} value={s.appliesTo} onChange={(e) => setS({ ...s, appliesTo: e.target.value as FundingScheme["appliesTo"] })}>
            <option value="GSS">Government sponsored</option>
            <option value="SSP">Self-sponsored</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Default band</span>
          <input type="number" className={`${input} w-20`} value={s.defaultBand} onChange={(e) => setS({ ...s, defaultBand: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.active} onChange={(e) => setS({ ...s, active: e.target.checked })} />
          In use
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Description</span>
        <textarea rows={2} className={input} value={s.description ?? ""} onChange={(e) => setS({ ...s, description: e.target.value })} />
      </label>
      <div className="overflow-x-auto">
        <table className="text-sm w-full">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="p-1">Band</th>
              <th className="p-1">Label</th>
              {keys.map((k) => (
                <th key={k} className="p-1 text-xs font-normal">{name(k)} %</th>
              ))}
              <th className="p-1">Total</th>
              <th className="p-1 text-xs font-normal">Upkeep (KES/yr)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {s.bands.map((b, i) => {
              const total = shareTotal({ ...b, shares: Object.fromEntries(Object.entries(b.shares).map(([k, v]) => [k, Number(v)])) });
              return (
                <tr key={i} className="border-t border-gray-100">
                  <td className="p-1">
                    <input type="number" className={`${input} w-14`} value={b.band} onChange={(e) => setBand(i, { band: Number(e.target.value) })} />
                  </td>
                  <td className="p-1">
                    <input className={`${input} min-w-[160px] w-full`} value={b.label} onChange={(e) => setBand(i, { label: e.target.value })} />
                  </td>
                  {keys.map((k) => (
                    <td key={k} className="p-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={`${input} w-16`}
                        value={b.shares[k] ?? 0}
                        onChange={(e) => setBand(i, { shares: { ...b.shares, [k]: Number(e.target.value) } })}
                      />
                    </td>
                  ))}
                  <td className={`p-1 font-medium ${total === 100 ? "text-green-600" : "text-red-500"}`}>{total}%</td>
                  <td className="p-1">
                    <input
                      type="number"
                      className={`${input} w-24`}
                      value={b.upkeep ?? ""}
                      onChange={(e) => setBand(i, { upkeep: e.target.value === "" ? undefined : Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1">
                    <button className="text-xs underline text-gray-400" onClick={() => setS({ ...s, bands: s.bands.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 items-center flex-wrap">
        <button
          className="text-xs underline text-gray-500"
          onClick={() => setS({ ...s, bands: [...s.bands, { band: (s.bands.at(-1)?.band ?? 0) + 1, label: "", shares: {} }] })}
        >
          Add band
        </button>
        <button onClick={save} disabled={busy} className="bg-blue-400 text-white py-1 px-4 rounded-md disabled:opacity-60 text-sm">
          {busy ? "Saving..." : "Save scheme"}
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  );
};

const PayersEditor = ({ payers }: { payers: Payer[] }) => {
  const [draft, setDraft] = useState({ key: "", name: "", kind: "bursary" as Payer["kind"] });
  const run = async (p: Parameters<typeof savePayer>[0]) => {
    try {
      await savePayer(p);
      toast("Payer saved!");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="bg-surface p-4 rounded-md flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Payers</h2>
      <p className="text-xs text-gray-400">
        Rename a payer when its name changes (for example if the Tertiary Education Funding Authority replaces HELB);
        its history is kept.
      </p>
      <ul className="flex flex-col divide-y divide-gray-100 text-sm">
        {payers.map((p) => (
          <li key={p.key} className="py-2 flex items-center gap-3 flex-wrap">
            <input
              className={`${input} flex-1 min-w-[200px]`}
              defaultValue={p.name}
              onBlur={(e) => e.target.value !== p.name && run({ ...p, name: e.target.value })}
              aria-label={`Name of ${p.key}`}
            />
            <span className="text-xs text-gray-400 w-32">{p.key}</span>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={p.active} onChange={(e) => run({ ...p, active: e.target.checked })} />
              Active
            </label>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 flex-wrap items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run({ ...draft, active: true }).then(() => setDraft({ key: "", name: "", kind: "bursary" }));
        }}
      >
        <input className={input} placeholder="Key, e.g. nairobi_county" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
        <input className={`${input} flex-1`} placeholder="Name, e.g. Nairobi County bursary" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <select className={input} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Payer["kind"] })}>
          <option value="bursary">Bursary</option>
          <option value="sponsor">Sponsor</option>
          <option value="government_scholarship">Government scholarship</option>
          <option value="government_loan">Government loan</option>
          <option value="household">Household</option>
        </select>
        <button className="bg-lamaYellow py-1 px-3 rounded-md text-sm">Add payer</button>
      </form>
    </div>
  );
};

const SchemesPage = () => {
  const schemes = useLiveQuery<FundingScheme>(() => query(col("fundingSchemes")), "schemes");
  const payers = useLiveQuery<Payer>(() => query(col("payers"), orderBy("name")), "payers-all");
  const [adding, setAdding] = useState(false);

  return (
    <div className="p-4 pt-0 flex flex-col gap-4">
      <div className="bg-surface p-4 rounded-md flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-lg font-semibold">Funding schemes</h1>
          <button className="bg-lamaYellow py-1 px-3 rounded-md text-sm" onClick={() => setAdding((a) => !a)}>
            {adding ? "Cancel" : "New scheme"}
          </button>
        </div>
        <Notice>
          A scheme sets how each invoice is split between payers. Government-sponsored students are placed in a band;
          self-sponsored students use a scheme for SSP. You choose the scheme each time you issue invoices, so a change
          in government policy only needs a new scheme here. Invoices already issued keep the split they had.
        </Notice>
        <p className="text-xs text-gray-400">
          Upkeep (paid by HELB directly to students) is recorded for reference and never billed. Example: band 3 on a
          {` ${formatKES(100000)}`} semester gives 50,000 scholarship, 30,000 loan and 20,000 household.
        </p>
      </div>
      {adding && (
        <SchemeEditor
          scheme={{ id: "", name: "", appliesTo: "GSS", defaultBand: 1, active: false, bands: [{ band: 1, label: "All students", shares: {} }] }}
          payers={payers.data}
          onDone={() => setAdding(false)}
        />
      )}
      {schemes.data.map((s) => (
        <SchemeEditor key={s.id} scheme={s} payers={payers.data} />
      ))}
      <PayersEditor payers={payers.data} />
    </div>
  );
};

export default withSuspense(SchemesPage);
