import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, Users, DollarSign, BarChart3, Download, Printer } from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  roles: string[];
  action: string;
}

const REPORT_CARDS: ReportCard[] = [
  {
    title: 'Student Report Cards',
    description: 'Generate individual academic report cards with marks, grades, and teacher comments.',
    icon: <FileText className="w-6 h-6 text-blue-600" />,
    badge: 'Academic',
    badgeColor: 'bg-blue-100 text-blue-700',
    roles: ['admin', 'director', 'head_teacher', 'class_teacher'],
    action: 'Generate',
  },
  {
    title: 'Class Performance Report',
    description: 'Summary of all students in a class — average marks, pass rates, and subject analysis.',
    icon: <BarChart3 className="w-6 h-6 text-indigo-600" />,
    badge: 'Academic',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    roles: ['admin', 'director', 'head_teacher', 'class_teacher'],
    action: 'Generate',
  },
  {
    title: 'Subject Analysis Report',
    description: 'Performance breakdown by subject across all classes — identify weak areas.',
    icon: <TrendingUp className="w-6 h-6 text-green-600" />,
    badge: 'Academic',
    badgeColor: 'bg-green-100 text-green-700',
    roles: ['admin', 'director', 'head_teacher', 'subject_teacher'],
    action: 'Generate',
  },
  {
    title: 'Attendance Summary',
    description: 'Daily, weekly, and term attendance records by class and student.',
    icon: <Users className="w-6 h-6 text-teal-600" />,
    badge: 'Attendance',
    badgeColor: 'bg-teal-100 text-teal-700',
    roles: ['admin', 'director', 'head_teacher', 'class_teacher'],
    action: 'Generate',
  },
  {
    title: 'Fee Collections Report',
    description: 'Daily, term, and annual fee collection summaries with payment method breakdown.',
    icon: <DollarSign className="w-6 h-6 text-yellow-600" />,
    badge: 'Finance',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    roles: ['admin', 'director', 'bursar'],
    action: 'Generate',
  },
  {
    title: 'Fee Defaulters List',
    description: 'List of students with outstanding balances — export for follow-up.',
    icon: <FileText className="w-6 h-6 text-red-600" />,
    badge: 'Finance',
    badgeColor: 'bg-red-100 text-red-700',
    roles: ['admin', 'director', 'bursar'],
    action: 'Export',
  },
  {
    title: 'Student Register',
    description: 'Full list of enrolled students with admission details and class assignments.',
    icon: <Users className="w-6 h-6 text-purple-600" />,
    badge: 'Administration',
    badgeColor: 'bg-purple-100 text-purple-700',
    roles: ['admin', 'director', 'head_teacher'],
    action: 'Print',
  },
  {
    title: 'Payment Receipts',
    description: 'Print individual payment receipts for any transaction.',
    icon: <Printer className="w-6 h-6 text-gray-600" />,
    badge: 'Finance',
    badgeColor: 'bg-gray-100 text-gray-700',
    roles: ['admin', 'director', 'bursar'],
    action: 'Print',
  },
];

export default function Reports() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const role = profile?.role || '';

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/stats', schoolId],
    queryFn: () => fetch(`/api/stats?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const availableReports = REPORT_CARDS.filter(r => r.roles.includes(role));

  const grouped = availableReports.reduce((acc: any, r) => {
    const badge = r.badge;
    if (!acc[badge]) acc[badge] = [];
    acc[badge].push(r);
    return acc;
  }, {});

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">{availableReports.length} reports available for your role</p>
        </div>

        {/* Quick stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Classes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalClasses}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Revenue (UGX)</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {parseFloat(stats.totalRevenue || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Payments</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendingPayments}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report cards by category */}
        {Object.entries(grouped).map(([category, reports]: any) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report: ReportCard, i: number) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                        {report.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{report.title}</h3>
                          <Badge className={`text-xs border-0 ${report.badgeColor}`}>{report.badge}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{report.description}</p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5">
                            <Download className="w-3.5 h-3.5" /> {report.action}
                          </Button>
                          {report.action !== 'Print' && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 gap-1.5 text-gray-500">
                              <Printer className="w-3.5 h-3.5" /> Print
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </RoleGuard>
  );
}
