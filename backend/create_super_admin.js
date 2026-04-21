import { connectDB, disconnectDB } from './src/seed/lib/db.js';
import User from './src/module/user/model/User.model.js';
import School from './src/module/school/School.model.js';
import bcrypt from 'bcryptjs';
import logger from './src/config/logger.js';
import { USER_ROLES } from './src/constants/userRoles.js';

const createSuperAdmin = async () => {
  logger.info('=== Creating Super Admin User ===');
  
  await connectDB();
  
  try {
    // Find AV school
    const avSchool = await School.findOne({ code: 'AV' });
    if (!avSchool) {
      throw new Error('AV school not found in database');
    }
    
    logger.info(`Found AV school: ${avSchool.name} (${avSchool.code})`);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'prakhar@protap.club' });
    if (existingUser) {
      logger.info('User already exists, deleting to recreate with correct credentials...');
      await User.deleteOne({ email: 'prakhar@protap.club' });
    }

    // Create super admin user
    // Note: We pass the plain password 'Demo@123'. 
    // The User model has a pre-save hook that will hash it before it hits the DB.
    const superAdmin = new User({
      name: 'Prakhar',
      email: 'prakhar@protap.club',
      password: 'Demo@123',
      role: USER_ROLES.SUPER_ADMIN,
      schoolId: avSchool._id,
      isActive: true,
    });

    await superAdmin.save();
    
    logger.info('Super Admin created successfully!');
    logger.info('Email: prakhar@protap.club');
    logger.info('Password: Demo@123');
    logger.info('User details:', {
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
      schoolId: superAdmin.schoolId,
      userId: superAdmin._id
    });
    
    logger.info('Login credentials:');
    logger.info('Email: prakhar@protap.club');
    logger.info('Password: Demo@123');
    logger.info('Role: Super Admin');
    
  } catch (error) {
    logger.error(`Error creating super admin: ${error.message}`);
    throw error;
  } finally {
    await disconnectDB();
  }
};

createSuperAdmin().catch(console.error);
