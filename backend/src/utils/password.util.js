/**
 * Password generation and hashing utilities.
 * Generates secure random passwords for new users and hashes passwords for storage.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs'; // Import bcrypt for hashing

/**
 * Generates a secure random password with a mix of character types.
 * @param {number} length - The desired length of the password (default: 12).
 * @returns {string} The generated secure password.
 */
export const generatePassword = (length = 12) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@#$%&*!';
    
    const allChars = uppercase + lowercase + numbers + special;
    
    // Ensure at least one of each character type for strong passwords.
    let password = '';
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += special[crypto.randomInt(special.length)];
    
    // Fill the remaining length with random characters from all types.
    for (let i = password.length; i < length; i++) {
        password += allChars[crypto.randomInt(allChars.length)];
    }
    
    // Shuffle the characters to randomize their order.
    return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
};

/**
 * Hashes a plain text password using bcrypt.
 * @param {string} plainPassword - The plain text password to hash.
 * @returns {Promise<string>} The hashed password.
 */
export const hashPassword = async (plainPassword) => {
    const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds.
    return bcrypt.hash(plainPassword, salt); // Hash the password with the generated salt.
};
