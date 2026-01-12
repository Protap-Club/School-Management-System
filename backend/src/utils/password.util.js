/**
 * Password generation utility
 * Generates secure random passwords for new users
 */

import crypto from 'crypto';

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Generated password
 */
export const generatePassword = (length = 12) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@#$%&*!';
    
    const allChars = uppercase + lowercase + numbers + special;
    
    // Ensure at least one of each type
    let password = '';
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += special[crypto.randomInt(special.length)];
    
    // Fill remaining length with random characters
    for (let i = password.length; i < length; i++) {
        password += allChars[crypto.randomInt(allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
};
