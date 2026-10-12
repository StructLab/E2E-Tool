interface SHACLResponse {
    // Define the structure you expect from the API
    conforms: boolean;
    results?: any[];
    [key: string]: any;
}

async function validateTurtle(content: string,
    options?: {
        embeddingMethod?: 'STRING' | 'URL' | 'BASE64';
        contentSyntax?: string;
        validationType?: string;
        reportSyntax?: string;
        locale?: string;
    }): Promise<SHACLResponse> {
    const payload = {
        contentToValidate: content,
        embeddingMethod: options?.embeddingMethod || 'STRING',
        contentSyntax: options?.contentSyntax || 'text/turtle',
        validationType: options?.validationType || 'large',
        reportSyntax: options?.reportSyntax || 'application/ld+json',
        locale: options?.locale || 'en'
    };

    try {
        const response = await fetch('https://www.itb.ec.europa.eu/shacl/ccstms/api/validate/', {
            method: 'POST',
            headers: {
                'Accept': payload.reportSyntax,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`SHACL validation failed: ${response.status} ${response.statusText}`);
        }

        const result: SHACLResponse = await response.json();
        console.log('Validation result:', result);
        return result;

    } catch (err) {
        console.error('Error calling SHACL API:', err);
        throw err;
    }
}