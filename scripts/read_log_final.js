const fs = require('fs');
try { console.log(fs.readFileSync('tsc_errors_final.log', 'utf16le')); } catch { console.log(fs.readFileSync('tsc_errors_final.log', 'utf8')); }
