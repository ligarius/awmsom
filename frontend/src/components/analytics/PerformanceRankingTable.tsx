"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface RankingRow {
  user: string;
  tasksPerHour: number;
  linesPerHour: number;
  errors: number;
}

export function PerformanceRankingTable({ rows }: { rows: RankingRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de operarios</CardTitle>
        <CardDescription>Productividad consolidada por usuario</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2">Operario</th>
                <th className="pb-2">Tareas/h</th>
                <th className="pb-2">Líneas/h</th>
                <th className="pb-2">Errores</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.user} className="hover:bg-muted/30">
                  <td className="py-2 font-medium">{row.user}</td>
                  <td className="py-2">{row.tasksPerHour.toFixed(1)}</td>
                  <td className="py-2">{row.linesPerHour.toFixed(1)}</td>
                  <td className="py-2 text-destructive">{row.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
