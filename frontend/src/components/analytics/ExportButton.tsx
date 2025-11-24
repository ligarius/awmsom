"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  disabled?: boolean;
}

function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const csvRows = rows.map((row) => headers.map((key) => JSON.stringify(row[key] ?? "")).join(","));
  return [headers.join(","), ...csvRows].join("\n");
}

function download(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton<T extends Record<string, unknown>>({ data, filename, disabled }: ExportButtonProps<T>) {
  const handleCsv = () => {
    const csv = toCsv(data);
    download(csv, `${filename}.csv`, "text/csv");
  };

  const handlePdf = () => {
    const html = `<html><body><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
    const base64 = btoa(unescape(encodeURIComponent(html)));
    const dataUrl = `data:application/pdf;base64,${base64}`;
    download(atob(base64), `${filename}.pdf`, "application/pdf");
    // Provide link for browsers that block pdf blob
    window.open(dataUrl, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="mr-2 h-4 w-4" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Descargar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleCsv}>CSV</DropdownMenuItem>
        <DropdownMenuItem onSelect={handlePdf}>PDF (base64)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
