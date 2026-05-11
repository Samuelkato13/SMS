import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const asArray = (v) => (Array.isArray(v) ? v : []);

const Marks = () => {
  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  // Fetch exams
  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const response = await axios.get('/api/exams');
      return asArray(response.data);
    },
  });

  // Fetch classes for selected exam
  const { data: classes } = useQuery({
    queryKey: ['exam-classes', selectedExam],
    queryFn: async () => {
      if (!selectedExam) return [];
      const response = await axios.get(`/api/exams/${selectedExam}/classes`);
      return asArray(response.data);
    },
    enabled: !!selectedExam,
  });

  // Fetch marks for selected class
  const { data: marks } = useQuery({
    queryKey: ['class-marks', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const response = await axios.get(`/api/marks/${selectedClass}`);
      return asArray(response.data);
    },
    enabled: !!selectedClass,
  });

  const handleMarkChange = async (studentId, subjectId, value) => {
    try {
      await axios.put(`/api/marks/${studentId}/${subjectId}`, { mark: value });
      // Refetch marks after update
      // You might want to use queryClient.invalidateQueries here
    } catch (error) {
      console.error('Error updating mark:', error);
    }
  };

  const calculateAverage = (marks) => {
    const validMarks = asArray(marks).filter(mark => mark !== null && mark !== undefined);
    if (validMarks.length === 0) return 0;
    return validMarks.reduce((a, b) => a + b, 0) / validMarks.length;
  };

  const calculateAggregate = (marks) => {
    // Implement your aggregate calculation logic here
    return asArray(marks).reduce((a, b) => a + b, 0);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Marks Management</h1>

      {/* Exam Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
        <select
          value={selectedExam || ''}
          onChange={(e) => {
            setSelectedExam(e.target.value);
            setSelectedClass(null);
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">Select an exam</option>
          {exams?.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name}
            </option>
          ))}
        </select>
      </div>

      {/* Class Selection */}
      {selectedExam && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a class</option>
            {classes?.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Marks Table */}
      {selectedClass && asArray(marks).length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                {user.role === 'subject_teacher' ? (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {user.subject}
                  </th>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      English
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Math
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Science
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SST
                    </th>
                    {/* Add more subjects as needed */}
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aggregate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {asArray(marks).map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.name}
                  </td>
                  {user.role === 'subject_teacher' ? (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={student.marks[user.subject] || ''}
                        onChange={(e) => handleMarkChange(student.id, user.subject, e.target.value)}
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        min="0"
                        max="100"
                      />
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={student.marks.english || ''}
                          onChange={(e) => handleMarkChange(student.id, 'english', e.target.value)}
                          className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          min="0"
                          max="100"
                        />
                      </td>
                      {/* Add more subject inputs */}
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calculateAverage(Object.values(student?.marks || {}))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calculateAggregate(Object.values(student?.marks || {}))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => window.print()}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Print Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Marks; 