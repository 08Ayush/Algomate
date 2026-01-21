'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        fetch('/api/openapi')
            .then((res) => res.json())
            .then((data) => setSpec(data));
    }, []);

    if (!spec) {
        return <div className="p-8">Loading API documentation...</div>;
    }

    return (
        <div className="container mx-auto">
            <SwaggerUI spec={spec} />
        </div>
    );
}
