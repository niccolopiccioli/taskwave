'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, Download, Loader2, TrendingUp, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeReportProps {
  workspaceId: string;
}

interface PerUser {
  user_id: string;
  name: string;
  hours: number;
}

interface PerDay {
  date: string;
  hours: number;
}

interface ReportData {
  total_hours: number;
  per_user: PerUser[];
  per_day: PerDay[];
}

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function TimeReport({ workspaceId }: TimeReportProps) {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      workspaceId,
      dateFrom: new Date(dateFrom).toISOString(),
      dateTo: new Date(dateTo + 'T23:59:59').toISOString(),
    });
    fetch(`/api/time/report?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReport(data);
      })
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [workspaceId, dateFrom, dateTo]);

  const maxUserHours = report?.per_user.length
    ? Math.max(...report.per_user.map((u) => u.hours), 0.1)
    : 1;

  const avgDaily = report?.per_day.length
    ? Math.round((report.total_hours / report.per_day.length) * 100) / 100
    : 0;

  const handleExportCsv = () => {
    if (!report) return;
    const rows = [['Data', 'Utente', 'Ore']];
    for (const entry of report.per_day) {
      for (const user of report.per_user) {
        rows.push([entry.date, user.name, String(user.hours)]);
      }
    }
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label className="text-xs">Da</Label>
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">A</Label>
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={handleExportCsv}
          disabled={!report}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Esporta CSV
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && report && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-teal-500/5 border-teal-500/20">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[10px] uppercase tracking-wider text-teal-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Ore totali
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-xl font-bold text-teal-400">{formatHours(report.total_hours)}</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[10px] uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Media giornaliera
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-xl font-bold text-amber-400">{formatHours(avgDaily)}</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[10px] uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  <User className="h-3 w-3" /> Utenti attivi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-xl font-bold text-purple-400">{report.per_user.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-teal-400" /> Per utente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {report.per_user.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nessun dato.</p>
              ) : (
                <div className="space-y-2">
                  {report.per_user.map((user) => (
                    <div key={user.user_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{user.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatHours(user.hours)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all"
                          style={{ width: `${(user.hours / maxUserHours) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-teal-400" /> Per giorno
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {report.per_day.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nessun dato.</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5">
                    {report.per_day.map((day) => (
                      <div key={day.date} className="flex items-center justify-between text-xs py-1">
                        <span>
                          {new Date(day.date).toLocaleDateString('it-IT', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatHours(day.hours)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
