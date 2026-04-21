export const patchTeacherExpectedSalaryInUsersCache = (queryClient, teacherId, expectedSalary) => {
    const idStr = String(teacherId);

    queryClient.setQueriesData({ queryKey: ['users', 'list'] }, (oldData) => {
        if (!oldData?.data?.users) return oldData;

        return {
            ...oldData,
            data: {
                ...oldData.data,
                users: oldData.data.users.map((user) =>
                    String(user?._id) === idStr
                        ? {
                            ...user,
                            profile: {
                                ...user.profile,
                                expectedSalary,
                            },
                        }
                        : user
                ),
            },
        };
    });

    queryClient.setQueryData(['users', 'detail', teacherId], (oldData) => {
        if (!oldData?.data) return oldData;

        return {
            ...oldData,
            data: {
                ...oldData.data,
                profile: {
                    ...oldData.data.profile,
                    expectedSalary,
                },
            },
        };
    });
};
