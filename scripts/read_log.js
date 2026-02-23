const fs = require('fs');
try {
    const content = fs.readFileSync('tsc_errors_2.log', 'utf16le'); // PowerShell redirection is typically UTF-16LE
    console.log(content);
} catch (e) {
    try {
        const content = fs.readFileSync('tsc_errors_2.log', 'utf8');
        console.log(content);
    } catch (e2) {
        console.error(e2);
    }
}
