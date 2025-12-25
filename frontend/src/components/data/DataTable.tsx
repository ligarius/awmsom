"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable
} from "@tanstack/react-table";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/data/Pagination";
import { FilterBar } from "@/components/data/FilterBar";
import type { PaginatedResult } from "@/types/common";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: PaginatedResult<TData>;
  onPageChange?: (page: number) => void;
  onFilterChange?: (term: string) => void;
  emptyMessage?: string;
  variant?: "contained" | "bare";
}

/**
 * Generic data table built on TanStack Table v8. It supports sorting,
 * pagination and a simple filter hook. Future sprints can extend this
 * component with column visibility, column filters and server-side
 * pagination hooks.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  onPageChange,
  onFilterChange,
  emptyMessage = "Sin resultados",
  variant = "contained"
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: data.items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const tableMarkup = (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className="cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                {header.isPlaceholder ? null : (
                  <div className="flex items-center gap-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? null}
                  </div>
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (variant === "bare") {
    return tableMarkup;
  }

  return (
    <div className="space-y-4">
      {onFilterChange ? <FilterBar onSearch={onFilterChange} /> : null}
      <div className="rounded-lg border bg-background">{tableMarkup}</div>
      {onPageChange ? (
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={onPageChange} />
      ) : null}
    </div>
  );
}
