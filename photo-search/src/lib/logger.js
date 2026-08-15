const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = levels[process.env.LOG_LEVEL] ?? levels.info;

function log(level, ...args) {
  if (levels[level] <= current) {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](prefix, ...args);
  }
}

module.exports = {
  error: (...a) => log('error', ...a),
  warn:  (...a) => log('warn', ...a),
  info:  (...a) => log('info', ...a),
  debug: (...a) => log('debug', ...a),
};
