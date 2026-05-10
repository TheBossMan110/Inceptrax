export interface CompetitorWatch {
    id: number;
    idea_id: number;
    keywords: string[];
    is_active: boolean;
    scan_frequency: string;
    last_scan_at: string | null;
    created_at: string;
    unread_alerts_count: number;
}

export interface CompetitorAlert {
    id: number;
    watch_id: number;
    alert_type: 'new_startup' | 'funding' | 'launch' | 'other';
    title: string;
    snippet: string;
    url: string;
    source: string;
    relevance_score: number;
    is_read: boolean;
    discovered_at: string;
}
