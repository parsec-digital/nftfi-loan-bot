import bunyan from 'bunyan';
import { LoggingBunyan } from '@google-cloud/logging-bunyan';

let logger;

export default {
  init: async function(options) {
    if (!logger) {
      try {
        const loggingBunyan = new LoggingBunyan();
        logger = bunyan.createLogger({
          name: `${options.name}-${options.mode}`,
          streams: [{ stream: process.stdout, level: 'info' }, loggingBunyan.stream('info')]
        });
      } catch (e) {
        console.log(e);
        logger = console;
      }
    }
    return logger;
  }
}