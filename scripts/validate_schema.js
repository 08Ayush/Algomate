const fs = require('fs');

/**
 * Simple SQL syntax validator to check for common PostgreSQL issues
 */
function validatePostgreSQLSchema(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();
        
        // Check for subqueries in CHECK constraints
        if (trimmed.includes('CHECK') && (trimmed.includes('EXISTS') || trimmed.includes('SELECT'))) {
            issues.push(`Line ${lineNum}: Potential subquery in CHECK constraint: ${trimmed}`);
        }
        
        // Check for missing semicolons after statements
        if (trimmed.endsWith(')') && !trimmed.endsWith(');') && 
            (trimmed.startsWith('CREATE TABLE') || trimmed.startsWith('CREATE TYPE'))) {
            const nextLine = lines[index + 1]?.trim();
            if (nextLine && !nextLine.startsWith(';') && !nextLine.startsWith('--')) {
                issues.push(`Line ${lineNum}: Possible missing semicolon after statement`);
            }
        }
        
        // Check for invalid enum casting
        if (trimmed.includes('::') && trimmed.includes('ARRAY[')) {
            const enumMatch = trimmed.match(/ARRAY\[.*?::(.*?),/);
            if (enumMatch && !enumMatch[1].includes('_')) {
                issues.push(`Line ${lineNum}: Possible enum casting issue: ${trimmed}`);
            }
        }
        
        // Check for JSONB casting issues
        if (trimmed.includes('DEFAULT') && trimmed.includes('{}') && !trimmed.includes('::JSONB')) {
            issues.push(`Line ${lineNum}: Missing JSONB casting: ${trimmed}`);
        }
    });
    
    return {
        valid: issues.length === 0,
        issues: issues,
        totalLines: lines.length
    };
}

try {
    const result = validatePostgreSQLSchema('d:\\Node p\\pygram\\database\\new_schema.sql');
    
    console.log('='.repeat(70));
    console.log('PostgreSQL Schema Validation Results');
    console.log('='.repeat(70));
    console.log(`Total lines analyzed: ${result.totalLines}`);
    console.log(`Issues found: ${result.issues.length}`);
    
    if (result.valid) {
        console.log('✅ Schema appears to be syntactically valid!');
        console.log('✅ No subquery CHECK constraints found');
        console.log('✅ No obvious PostgreSQL compatibility issues detected');
    } else {
        console.log('❌ Issues detected:');
        result.issues.forEach(issue => {
            console.log(`   ${issue}`);
        });
    }
    
    console.log('='.repeat(70));
    console.log('Manual verification recommended with PostgreSQL client');
    console.log('='.repeat(70));
    
} catch (error) {
    console.error('Error validating schema:', error.message);
    process.exit(1);
}