import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { DollarSign, CreditCard, TrendingUp, Users } from 'lucide-react';
import { firestoreService } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';

export const BursarDashboard = () => {
  const { profile } = useAuth();

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => firestoreService.getStudentsBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value={students.length}
          change="Fee payers"
          changeType="neutral"
          icon={Users}
          iconColor="bg-blue-500"
        />
        <StatsCard
          title="Fees Collected"
          value="UGX 45.2M"
          change="78% collection rate"
          changeType="positive"
          icon={DollarSign}
          iconColor="bg-green-500"
        />
        <StatsCard
          title="Outstanding Fees"
          value="UGX 12.8M"
          change="22% pending"
          changeType="negative"
          icon={CreditCard}
          iconColor="bg-red-500"
        />
        <StatsCard
          title="This Month"
          value="UGX 8.4M"
          change="+15% from last month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-purple-500"
        />
      </div>

      {/* Payment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Fee Collection Trend</h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center text-gray-500">
              Fee collection chart would be rendered here
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700">Mobile Money (MTN)</span>
                </div>
                <span className="font-medium">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">Mobile Money (Airtel)</span>
                </div>
                <span className="font-medium">32%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Bank Transfer</span>
                </div>
                <span className="font-medium">18%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Cash</span>
                </div>
                <span className="font-medium">5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments & Outstanding Fees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {students.slice(0, 5).map((student, index) => (
                <div key={student.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-medium text-sm">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{student.paymentCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      UGX {(350000 - index * 25000).toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600">Paid</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Outstanding Fees */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Outstanding Fees</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {students.slice(5, 10).map((student, index) => (
                <div key={student.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-medium text-sm">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{student.paymentCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      UGX {(180000 + index * 45000).toLocaleString()}
                    </p>
                    <p className="text-sm text-red-600">Pending</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
