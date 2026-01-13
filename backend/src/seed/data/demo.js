/**
 * Demo Data - Sample schools and users for testing
 */

export const DEMO_SCHOOLS = [
    {
        name: "Indian Institute of Technology Delhi",
        code: "IITD",
        address: "Hauz Khas, New Delhi, Delhi 110016",
        contactPhone: "+91-11-26591999",
        features: { attendance: { enabled: true } }
    },
    {
        name: "Indian Institute of Management Ahmedabad",
        code: "IIMA",
        address: "Vastrapur, Ahmedabad, Gujarat 380015",
        contactPhone: "+91-79-66324444",
        features: { attendance: { enabled: true } }
    }
];

export const DEMO_USERS = {
    IITD: {
        admins: [
            { name: "Dean Of Academics", email: "dean.academics@iitd.ac.in", department: "Administration", employeeId: "ADM001" }
        ],
        teachers: [
            { name: "Prof. Amit Sharma", email: "amit.sharma@iitd.ac.in", department: "Computer Science", designation: "Professor", employeeId: "CSE101" },
            { name: "Dr. Priya Singh", email: "priya.singh@iitd.ac.in", department: "Electrical Engineering", designation: "Associate Professor", employeeId: "EE102" },
            { name: "Prof. Rajesh Kumar", email: "rajesh.kumar@iitd.ac.in", department: "Mechanical Engineering", designation: "HOD", employeeId: "ME103" },
            { name: "Dr. Anjali Gupta", email: "anjali.gupta@iitd.ac.in", department: "Physics", designation: "Assistant Professor", employeeId: "PHY104" },
            { name: "Prof. Suresh Reddy", email: "suresh.reddy@iitd.ac.in", department: "Civil Engineering", designation: "Professor", employeeId: "CE105" }
        ],
        students: [
            // CS Students
            ...Array.from({ length: 10 }, (_, i) => ({
                name: `CS Student ${i + 1}`,
                email: `cs${2023001 + i}@iitd.ac.in`,
                rollNumber: `2023CS${10001 + i}`,
                course: "B.Tech",
                year: 2023,
                section: "A"
            })),
            // EE Students
            ...Array.from({ length: 10 }, (_, i) => ({
                name: `EE Student ${i + 1}`,
                email: `ee${2023001 + i}@iitd.ac.in`,
                rollNumber: `2023EE${10001 + i}`,
                course: "B.Tech",
                year: 2023,
                section: "B"
            }))
        ]
    },
    IIMA: {
        admins: [
            { name: "Director Office", email: "director@iima.ac.in", department: "Administration", employeeId: "ADM001" }
        ],
        teachers: [
            { name: "Prof. Marketing Expert", email: "marketing@iima.ac.in", department: "Marketing", designation: "Professor", employeeId: "MKT101" },
            { name: "Dr. Finance Guru", email: "finance@iima.ac.in", department: "Finance", designation: "Associate Professor", employeeId: "FIN102" }
        ],
        students: Array.from({ length: 10 }, (_, i) => ({
            name: `MBA Student ${i + 1}`,
            email: `mba${2025001 + i}@iima.ac.in`,
            rollNumber: `2025MBA${10001 + i}`,
            course: "MBA",
            year: 2025,
            section: "A"
        }))
    }
};

export default { DEMO_SCHOOLS, DEMO_USERS };
