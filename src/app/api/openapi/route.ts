import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * OpenAPI Specification Endpoint
 * Serves the OpenAPI spec in JSON format
 */
export async function GET() {
    try {
        const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi.yaml');
        const fileContents = fs.readFileSync(openApiPath, 'utf8');
        const spec = yaml.load(fileContents);

        return NextResponse.json(spec);
    } catch (error) {
        console.error('Error loading OpenAPI spec:', error);
        return NextResponse.json(
            { error: 'Failed to load API specification' },
            { status: 500 }
        );
    }
}
