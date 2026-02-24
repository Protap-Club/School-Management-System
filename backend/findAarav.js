import mongoose from 'mongoose';
import { conf } from './src/config/index.js';

await mongoose.connect(conf.MONGO_URI, { dbName: 'Protap' });

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
const aarav = await User.findOne({ name: /aarav sharma/i }).lean();

if (aarav) {
    console.log('\n✅ Aarav Sharma found!');
    console.log('   _id      :', aarav._id.toString());
    console.log('   email    :', aarav.email);
    console.log('   role     :', aarav.role);
    console.log('   nfcUid   :', aarav.nfcUid || '(not linked yet)');
    console.log('   schoolId :', aarav.schoolId?.toString());
} else {
    console.log('❌ Aarav Sharma not found in DB');
}

await mongoose.disconnect();
process.exit(0);
