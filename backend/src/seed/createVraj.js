import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
config();

const MONGO_URI = process.env.MONGO_URI;
const NFC_UID = '53:DF:CC:FA:31:00:01';

async function createVrajStudent() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: 'Protap' });
        console.log('Connected to MongoDB');

        // Get all schools
        const schools = await mongoose.connection.db.collection('schools').find({}).toArray();
        console.log(`Found ${schools.length} school(s)`);

        if (schools.length === 0) {
            console.log('No schools found! Please create a school first.');
            process.exit(1);
        }

        // Use the first school
        const school = schools[0];
        console.log(`Using school: ${school.name} (${school._id})`);

        // Check if Vraj already exists
        const existingUser = await mongoose.connection.db.collection('users').findOne({
            email: 'vraj@student.school.com'
        });

        if (existingUser) {
            console.log('User Vraj already exists, updating NFC UID...');
            await mongoose.connection.db.collection('users').updateOne(
                { _id: existingUser._id },
                { $set: { nfcUid: NFC_UID } }
            );
            console.log(`✅ NFC tag linked to existing student Vraj!`);
            console.log(`   Student ID: ${existingUser._id}`);
            console.log(`   NFC UID: ${NFC_UID}`);
        } else {
            // Create new student
            const hashedPassword = await bcrypt.hash('Vraj@123', 10);
            
            const result = await mongoose.connection.db.collection('users').insertOne({
                name: 'Vraj Pandya',
                email: 'vraj@student.school.com',
                password: hashedPassword,
                role: 'student',
                schoolId: school._id,
                contactNo: '+91 9876543210',
                nfcUid: NFC_UID,
                isEmailVerified: false,
                isActive: true,
                isArchived: false,
                mustChangePassword: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            console.log(`✅ Student Vraj created successfully!`);
            console.log(`   Student ID: ${result.insertedId}`);
            console.log(`   Email: vraj@student.school.com`);
            console.log(`   School: ${school.name}`);
            console.log(`   NFC UID: ${NFC_UID}`);

            // Create student profile
            await mongoose.connection.db.collection('studentprofiles').insertOne({
                userId: result.insertedId,
                rollNumber: 'NFC-001',
                standard: '10th',
                year: 2026,
                section: 'A',
                guardianName: 'Parent Pandya',
                guardianContact: '+91 9876543211',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`   Profile created with roll number: NFC-001`);
        }

        console.log('\n🎉 Ready to test! Go to Attendance page and scan your NFC tag.');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createVrajStudent();
