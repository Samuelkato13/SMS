import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Download, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';

const PAGE_SIZE = 20;

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-gray-100 text-gray-600',
  create_school: 'bg-green-100 text-green-700',
  update_school: 'bg-yellow-100 text-yellow-700',
  delete_school: 'bg-red-100 text-red-700',
  suspend_school: 'bg-orange-100 text-orange-700',
  create_user: 'bg-indigo-100 text-indigo-700',
  deactivate_user: 'bg-red-100 text-red-700',
  assign_subscription: 'bg-purple-100 text-purple-700',
  update_settings: 'bg-teal-100 text-teal-700',
};

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data: logs = [], isLoading } = useQuery<any[]>({ queryKey: ['/api/admin/audit-logs'] });

  const filtered = logs.filter(l => {
    const matchSearch = search === '' ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchSearch && matchAction;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const uniqueActions = [...new Set(logs.map(l => l.action))].filter(Boolean);

  const exportCSV = () => {
    const header = 'User,Action,Details,IP Address,Timestamp';
    const rows = filtered.map(l =>
      [l.user_email, l.action, (l.details ?? '').replace(/,/g, ';'), l.ip_address ?? '', new Date(l.created_at).toISOString()].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500">{logs.length} total entries — read-only</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <Download className="w-4 h-4" />Export CSV
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search logs..." className="pl-9 h-9" />
              </div>
              <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All Actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(a => (
                    <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP Address</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-5 py-3">
                        <div className="animate-pulse h-3.5 bg-gray-100 rounded" />
                      </td></tr>
                    ))
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                      <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No logs found
                    </td></tr>
                  ) : paged.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-xs font-medium text-gray-800">{log.user_email}</p>
                        {log.school_name && <p className="text-[11px] text-gray-400">{log.school_name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] px-1.5 ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.action?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{log.details ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{log.ip_address ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0">
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
