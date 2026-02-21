"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { FileText, Download } from "lucide-react";
import { jsPDF } from "jspdf";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VisitSummary({ visitId }: { visitId: string }) {
  const { data, isLoading } = useSWR(`/api/visits/${visitId}/summary`, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false, // prevent SWR from auto-refreshing when tab regains focus
    revalidateOnReconnect: false, // prevent auto-refresh on reconnect
  });

  const [generating, setGenerating] = useState(false);

  const downloadPDF = () => {
    if (!data?.summary) return;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(data.summary, 180);
    doc.text(lines, 15, 15);
    doc.save(`Visit-${visitId}-Summary.pdf`);
  };

  const regenerate = async () => {
    setGenerating(true);
    await fetch(`/api/visits/${visitId}/summary?force=true`);
    mutate(`/api/visits/${visitId}/summary`); // refresh SWR cache
    setGenerating(false);
  };

  if (isLoading) return <p className="text-slate-500">Generating AI summary…</p>;
  if (!data) return <p className="text-slate-500">No summary available</p>;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="card-title flex items-center gap-2">
          <FileText className="h-5 w-5" /> AI Visit Summary
        </h2>
        <div className="flex gap-2">
          <button
            onClick={downloadPDF}
            className="btn-primary text-xs"
          >
            <Download className="h-3 w-3" /> PDF
          </button>
          <button
            onClick={regenerate}
            className="btn btn-secondary text-xs"
          >
            {generating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>
      <pre className="text-sm whitespace-pre-wrap">{data.summary}</pre>
    </div>
  );
}