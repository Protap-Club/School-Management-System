import { v2 as cloudinary } from 'cloudinary';
import { conf } from './index.js';
import logger from './logger.js';

cloudinary.config({
    cloud_name: conf.CLOUDINARY_CLOUD_NAME,
    api_key: conf.CLOUDINARY_API_KEY,
    api_secret: conf.CLOUDINARY_API_SECRET,
});

logger.info('Cloudinary configured successfully.');

export default cloudinary;
