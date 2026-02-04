// Diagnostic script to view timetable entries
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// Connect to the same database the app uses - 'Protap'
const MONGO_URI = process.env.MONGO_URI.replace('/?appName', '/Protap?appName');

async function diagnose() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };
    
    try {
        await mongoose.connect(MONGO_URI);
        log('Connected to MongoDB - Protap database');

        const db = mongoose.connection.db;
        
        // Get all timetable entries
        const entries = await db.collection('timetableentries').find({ isActive: true }).toArray();
        log('\n=== TIMETABLE ENTRIES ===');
        log(`Total entries: ${entries.length}`);
        
        for (const entry of entries) {
            log(`\nEntry ID: ${entry._id}`);
            log(`  Timetable ID: ${entry.timetableId}`);
            log(`  Day: ${entry.dayOfWeek}, TimeSlot: ${entry.timeSlotId}`);
            log(`  Subject: ${entry.subject || 'N/A'}`);
            log(`  Teacher ID: ${entry.teacherId || 'N/A'}`);
        }

        // Get all timetables
        const timetables = await db.collection('timetables').find({ isActive: true }).toArray();
        log('\n=== TIMETABLES ===');
        for (const tt of timetables) {
            log(`${tt.standard}-${tt.section} (ID: ${tt._id})`);
        }

        // Get teachers
        const teachers = await db.collection('users').find({ role: 'teacher' }).toArray();
        log('\n=== TEACHERS ===');
        for (const t of teachers) {
            log(`${t.name} (ID: ${t._id})`);
        }

        // Write to file
        fs.writeFileSync('diagnostic_output.txt', output);
        console.log('\n=== OUTPUT SAVED TO diagnostic_output.txt ===');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

diagnose();
