import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { AttendanceChart } from '../charts/AttendanceChart';
import { Users, Star, CheckSquare, FileText } from 'lucide-react';
import { firestoreService } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export const ClassTeacherDashboard = () => {
  const { profile } = useAuth();

  // For class teacher, we need to find their assigned classes
  const { data: classes = [] } = useQuery({
    queryKey: ['/api/classes/teacher', profile?.id],
    queryFn: () => firestoreService.getClassesBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const myClasses = classes.filter(cls => cls.classTeacherId === profile?.id);
  const myClassIds = myClasses.map(cls => cls.id);

  const { data: myStudents = [] } = useQuery({
    queryKey: ['/api/students/my-classes', myClassIds],
    queryFn: async () => {
      const allStudents = [];
      for (const classId of myClassIds) {
        const students = await firestoreService.getStudentsByClass(classId);
        allStudents.push(...students);
      }
      return allStudents;
    },
    enabled: myClassIds.length > 0,
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="My Students"
          value={myStudents.length}
          change={`In ${myClasses.length} classes`}
          changeType="neutral"
          icon={Users}
          iconColor="bg-blue-500"
        />
        <StatsCard
          title="My Classes"
          value={myClasses.length}
          change="Currently teaching"
          changeType="neutral"
          icon={CheckSquare}
          iconColor="bg-green-500"
        />
        <StatsCard
          title="Class Average"
          value="85.2%"
          change="+3.1% from last term"
          changeType="positive"
          icon={Star}
          iconColor="bg-purple-500"
        />
        <StatsCard
          title="Attendance"
          value="96.5%"
          change="This week"
          changeType="positive"
          icon={CheckSquare}
          iconColor="bg-orange-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <AttendanceChart />
      </div>

      {/* Class Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Classes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">My Classes</h3>
              <Button size="sm" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {myClasses.map((classItem) => (
                <div key={classItem.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{classItem.name}</h4>
                      <p className="text-sm text-gray-500">Level {classItem.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {myStudents.filter(s => s.classId === classItem.id).length}
                      </p>
                      <p className="text-sm text-gray-500">students</p>
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline">Take Attendance</Button>
                    <Button size="sm" variant="outline">View Students</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Students */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">My Students</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {myStudents.slice(0, 6).map((student) => (
                <div key={student.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">
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
                  <Button size="sm" variant="outline">
                    Report
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center">
              <CheckSquare className="w-6 h-6 mb-2" />
              Take Attendance
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Star className="w-6 h-6 mb-2" />
              Record Marks
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <FileText className="w-6 h-6 mb-2" />
              Generate Report
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Users className="w-6 h-6 mb-2" />
              View Students
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
