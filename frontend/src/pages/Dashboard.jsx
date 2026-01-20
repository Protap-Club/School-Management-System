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
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="relative bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
          {/* Elegant Background Decor */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-50 to-transparent blur-2xl"></div>

          <div className="relative z-10 space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                Welcome, <br className="md:hidden" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 font-extrabold pb-1 inline-block">
                  {user?.name}
                </span>
              </h1>

            </div>

            <div className="pt-6 flex flex-wrap gap-4 items-center">
              {/* School Name Badge */}
              {user?.schoolId?.name && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-700 shadow-sm">
                  <span className="font-semibold text-sm tracking-wide uppercase text-gray-400 mr-2">School</span>
                  <span className="font-medium text-gray-900">{user.schoolId.name}</span>
                </div>
              )}

              {/* Class Teacher Badge */}
              {user?.role === 'teacher' && teacherProfile && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-800 shadow-sm">
                  <span className="font-semibold text-sm tracking-wide uppercase text-blue-400 mr-2">Class Teacher</span>
                  <span className="font-medium text-blue-900">{teacherProfile.standard} • {teacherProfile.section}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
