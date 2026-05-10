const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',  // Send httpOnly cookies with every request
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Something went wrong');
    }

    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/x-sqlite3'))) {
        return response.blob() as any;
    }

    return response.json();
}
