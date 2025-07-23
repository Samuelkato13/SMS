import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { firestoreService } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Users } from 'lucide-react';
import { Student } from '@/types';

export const StudentList = () => {
  const { profile } = useAuth();
  const { canCreate } = useRole();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => firestoreService.getStudentsBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => firestoreService.getClassesBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.paymentCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClassName = (classId: string) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : 'Unknown Class';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Manage student records and information</p>
        </div>
        {canCreate('students') && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search students by name or payment code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredStudents.length} of {students.length} students
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Grid */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding your first student.'}
            </p>
            {canCreate('students') && !searchTerm && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Student
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {student.firstName} {student.lastName}
                      </CardTitle>
                      <p className="text-sm text-gray-500">{getClassName(student.classId)}</p>
                    </div>
                  </div>
                  <Badge variant={student.isActive ? "default" : "secondary"}>
                    {student.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Code:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {student.paymentCode}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Guardian:</span>
                    <span className="text-gray-900">{student.guardianName}</span>
                  </div>
                  {student.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="text-gray-900 truncate">{student.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900">{student.guardianPhone}</span>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline">
                    Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
