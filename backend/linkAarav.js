import mongoose from 'mongoose';
import { conf } from './src/config/index.js';

await mongoose.connect(conf.MONGO_URI, { dbName: 'Protap' });

const U = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
const result = await U.findOneAndUpdate(
    { _id: '698af560b772b710fbd1e9b3' },
    { $set: { nfcUid: '53:DF:CC:FA:31:00:01' } },
    { new: true }
);

if (result) {
    console.log('✅ NFC Linked!');
    console.log('   Name   :', result.name);
    console.log('   nfcUid :', result.nfcUid);
} else {
    console.log('❌ Student not found');
}

await mongoose.disconnect();
process.exit(0);
