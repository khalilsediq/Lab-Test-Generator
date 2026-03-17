import electron from 'electron';
console.log('--- ESM TEST ---');
console.log('App object:', electron.app ? 'DEFINED' : 'UNDEFINED');
process.exit(0);
