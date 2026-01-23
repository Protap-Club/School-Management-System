import pino from 'pino';
import { conf } from './index.js';

// Determine the environment
const isProduction = conf.NODE_ENV === 'production';

// Pino configuration options
const pinoOptions = {
    level: conf.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    ...(isProduction
        ? {} // Production settings: simple JSON logs
        : { // Development settings: pretty, human-readable logs
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        }),
};

// Create the logger instance
const logger = pino(pinoOptions);

export default logger;
