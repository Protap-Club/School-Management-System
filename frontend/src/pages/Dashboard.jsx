import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import DashboardLayout from '../layouts/DashboardLayout';

const Dashboard = () => {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = React.useState(null);

  React.useEffect(() => {
    const fetchTeacherDetails = async () => {
      if (user?.role === 'teacher') {
        try {
          // Workaround: We can't fetch our own profile directly.
          // But we know 'get-users' returns ONLY our students.
          // And 'get-users-with-profiles' returns ALL students with profiles.
          // So we fetch both, cross-reference to find ONE of our students, and grab the Standard/Section from them.

          const [filteredResponse, allProfilesResponse] = await Promise.all([
            api.get('/user/get-users?role=student&pageSize=1'),
            api.get('/user/get-users-with-profiles?role=student')
          ]);

          if (filteredResponse.data.success && allProfilesResponse.data.success) {
            const myStudents = filteredResponse.data.data;
            const allProfiles = allProfilesResponse.data.data;

            if (myStudents.length > 0) {
              const firstStudentId = myStudents[0]._id;
              const firstStudentProfile = allProfiles.find(s => s._id === firstStudentId);

              if (firstStudentProfile?.profile) {
                setTeacherProfile({
                  standard: firstStudentProfile.profile.standard,
                  section: firstStudentProfile.profile.section
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to infer teacher details", error);
        }
      }
    };

    fetchTeacherDetails();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/10 shadow-sm relative overflow-hidden">
          {/* Background decoration circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/5"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-primary/5"></div>

          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2 tracking-tight text-gray-800">
              Welcome, <span className="text-primary/80 font-medium">{user?.name}</span>
            </h1>

            {/* Show School Name for Admin & Teacher */}
            {(user?.role === 'admin' || user?.role === 'teacher') && user?.schoolId?.name && (
              <p className="text-xl text-gray-600 font-medium mt-2">
                {user.schoolId.name}
              </p>
            )}

            {/* Show Class Assignment for Teacher */}
            {user?.role === 'teacher' && teacherProfile && (
              <p className="text-lg text-gray-500 mt-1">
                Class Teacher: <span className="font-medium text-gray-700">{teacherProfile.standard} - {teacherProfile.section}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
