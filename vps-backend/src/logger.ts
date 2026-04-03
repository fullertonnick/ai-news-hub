import winston from 'winston';

export function createLogger(label: string) {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${label}] ${level}: ${message}`)
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'logs/app.log', maxsize: 5_000_000, maxFiles: 3 }),
    ],
  });
}
