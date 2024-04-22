import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.printf(info => `[${info.timestamp} ${info.level.toUpperCase()}] ${info.message}`)
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export default logger;
