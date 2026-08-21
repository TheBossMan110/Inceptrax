const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Standard response envelope.
 *
 * Every router wraps its payload as {status, message, data}, so typed calls
 * should be written `apiFetch<ApiEnvelope<T>>(...)` and read `res.data`.
 */
export interface ApiEnvelope<T> {
    status: string;
    message?: string;
    data: T;
}

/** Structured detail returned by the backend on a 402 Payment Required. */
export interface CreditBlockDetail {
    error: 'insufficient_credits' | 'idea_limit_reached';
    message: string;
    operation?: string;
    cost?: number;
    balance?: number;
    current?: number;
    maximum?: number;
    tier: string;
    tier_label: string;
    monthly_credits?: number;
    upgrade_url: string;
}

/**
 * Error thrown by apiFetch for any non-2xx response.
 *
 * Carries the HTTP status and the parsed body so callers can react to the
 * *kind* of failure, not just its text. Previously the body was collapsed into
 * a string, which turned structured 402 payloads into "[object Object]".
 */
export class ApiError extends Error {
    status: number;
    detail: any;

    constructor(message: string, status: number, detail?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.detail = detail;
    }

    /** True when the request failed because the user is out of credits or slots. */
    get isCreditBlock(): boolean {
        return this.status === 402;
    }

    get creditDetail(): CreditBlockDetail | null {
        return this.status === 402 && this.detail && typeof this.detail === 'object'
            ? (this.detail as CreditBlockDetail)
            : null;
    }
}

/** Listeners notified whenever a 402 is received, so the UI can prompt to upgrade. */
type CreditBlockListener = (detail: CreditBlockDetail) => void;
const creditBlockListeners = new Set<CreditBlockListener>();

export function onCreditBlock(listener: CreditBlockListener): () => void {
    creditBlockListeners.add(listener);
    return () => creditBlockListeners.delete(listener);
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    // Attach JWT token from localStorage as Bearer header
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',  // Still send cookies (works for same-domain/localhost)
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const detail = data?.detail ?? data;

        // A 402 always carries structured detail; surface it to the global
        // handler so any screen gets the upgrade prompt without wiring it up.
        if (response.status === 402 && detail && typeof detail === 'object') {
            creditBlockListeners.forEach((fn) => {
                try { fn(detail as CreditBlockDetail); } catch { /* listener errors are not the caller's problem */ }
            });
        }

        const message =
            (typeof detail === 'object' ? detail?.message : detail) ||
            data?.message ||
            data?.error ||
            `Request failed (${response.status})`;

        throw new ApiError(String(message), response.status, detail);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/x-sqlite3'))) {
        return response.blob() as any;
    }

    return response.json();
}
