/**
 * Demo Data - Sample schools and users for testing
 * IITD: 50 students, 20 teachers, 2 admins
 * IIMA: 50 students, 20 teachers, 2 admins
 */

// Indian first names and last names for realistic data
const FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Ananya", "Aadhya", "Diya", "Priya", "Anika", "Saanvi", "Aanya", "Kavya", "Rhea", "Isha",
    "Rohan", "Aryan", "Kabir", "Dhruv", "Harsh", "Dev", "Aakash", "Rahul", "Karan", "Nikhil",
    "Sneha", "Pooja", "Neha", "Shruti", "Divya", "Riya", "Pallavi", "Tanvi", "Nidhi", "Megha",
    "Vikram", "Saurabh", "Gaurav", "Manish", "Deepak", "Rajat", "Amit", "Sumit", "Vikas", "Ankur",
    "Swati", "Sonali", "Sakshi", "Komal", "Kajal", "Shikha", "Richa", "Ankita", "Garima", "Shweta"
];

const LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Rao", "Iyer", "Nair",
    "Joshi", "Agarwal", "Mishra", "Pandey", "Mehta", "Shah", "Gandhi", "Chopra", "Kapoor", "Malhotra",
    "Banerjee", "Mukherjee", "Chatterjee", "Das", "Roy", "Bose", "Sen", "Ghosh", "Dutta", "Bhattacharya"
];

const getRandomName = (index) => {
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(index * 7) % LAST_NAMES.length];
    return `${firstName} ${lastName}`;
};

const generateEmail = (name, domain, index) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '.');
    return `${cleanName}.${index}@${domain}`;
};

// Demo Schools
export const DEMO_SCHOOLS = [
    {
        name: "Indian Institute of Technology Delhi",
        code: "IITD",
        address: "Hauz Khas, New Delhi, Delhi 110016",
        contactPhone: "+91-11-26591999"
    },
    {
        name: "Indian Institute of Management Ahmedabad",
        code: "IIMA",
        address: "Vastrapur, Ahmedabad, Gujarat 380015",
        contactPhone: "+91-79-66324444"
    }
];

// IITD Users
const IITD_DEPARTMENTS = ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Chemical Engineering"];
const IITD_COURSES = ["B.Tech", "M.Tech", "PhD"];

const generateIITDAdmins = () => [
    { name: "Dr. Ramesh Malhotra", email: "ramesh.malhotra@iitd.ac.in", department: "Administration", employeeId: "ADM001" },
    { name: "Prof. Sunita Kapoor", email: "sunita.kapoor@iitd.ac.in", department: "Academic Affairs", employeeId: "ADM002" }
];

const generateIITDTeachers = () => Array.from({ length: 20 }, (_, i) => ({
    name: getRandomName(i + 100),
    email: generateEmail(getRandomName(i + 100), "iitd.ac.in", i + 1),
    department: IITD_DEPARTMENTS[i % IITD_DEPARTMENTS.length],
    designation: i < 5 ? "Professor" : i < 12 ? "Associate Professor" : "Assistant Professor",
    employeeId: `IITD${String(i + 101).padStart(3, '0')}`
}));

const generateIITDStudents = () => Array.from({ length: 50 }, (_, i) => ({
    name: getRandomName(i),
    email: generateEmail(getRandomName(i), "student.iitd.ac.in", 2024000 + i),
    rollNumber: `2024${IITD_DEPARTMENTS[i % 5].substring(0, 2).toUpperCase()}${String(i + 1).padStart(4, '0')}`,
    standard: IITD_COURSES[i % 3],
    year: 2024,
    section: String.fromCharCode(65 + (i % 4))
}));

// IIMA Users
const IIMA_DEPARTMENTS = ["Marketing", "Finance", "Operations", "Strategy", "Economics", "HR & OB"];
const IIMA_COURSES = ["MBA", "PGPX", "PhD"];

const generateIIMAAdmins = () => [
    { name: "Dr. Ashok Mehta", email: "ashok.mehta@iima.ac.in", department: "Administration", employeeId: "ADM001" },
    { name: "Prof. Lakshmi Nair", email: "lakshmi.nair@iima.ac.in", department: "Academic Office", employeeId: "ADM002" }
];

const generateIIMATeachers = () => Array.from({ length: 20 }, (_, i) => ({
    name: getRandomName(i + 200),
    email: generateEmail(getRandomName(i + 200), "iima.ac.in", i + 1),
    department: IIMA_DEPARTMENTS[i % IIMA_DEPARTMENTS.length],
    designation: i < 6 ? "Professor" : i < 14 ? "Associate Professor" : "Assistant Professor",
    employeeId: `IIMA${String(i + 101).padStart(3, '0')}`
}));

const generateIIMAStudents = () => Array.from({ length: 50 }, (_, i) => ({
    name: getRandomName(i + 50),
    email: generateEmail(getRandomName(i + 50), "student.iima.ac.in", 2024000 + i),
    rollNumber: `2024${IIMA_COURSES[i % 3].substring(0, 3).toUpperCase()}${String(i + 1).padStart(4, '0')}`,
    standard: IIMA_COURSES[i % 3],
    year: 2024,
    section: String.fromCharCode(65 + (i % 3))
}));

// Combined Demo Users
export const DEMO_USERS = {
    IITD: {
        admins: generateIITDAdmins(),
        teachers: generateIITDTeachers(),
        students: generateIITDStudents()
    },
    IIMA: {
        admins: generateIIMAAdmins(),
        teachers: generateIIMATeachers(),
        students: generateIIMAStudents()
    }
};

export default { DEMO_SCHOOLS, DEMO_USERS };
