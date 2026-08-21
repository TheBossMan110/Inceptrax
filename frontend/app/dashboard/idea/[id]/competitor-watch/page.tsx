"use client"

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, BellOff, TrendingUp, Rocket, DollarSign, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { apiFetch, type ApiEnvelope } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CompetitorWatch as CompetitorWatchType, CompetitorAlert } from "@/types/competitor";

const EASE = [0.22, 1, 0.36, 1] as const;

const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export default function CompetitorWatchPage() {
    const params = useParams();
    const ideaId = parseInt(params.id as string);

    const [watch, setWatch] = useState<CompetitorWatchType | null>(null);
    const [alerts, setAlerts] = useState<CompetitorAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        fetchWatchConfig();
        fetchAlerts();
    }, [ideaId]);

    const fetchWatchConfig = async () => {
        try {
            const response = await apiFetch<ApiEnvelope<{ watch: CompetitorWatchType | null; has_watch: boolean }>>(
                `/ideas/${ideaId}/competitor-watch`
            );
            if (response.data && response.data.has_watch) {
                setWatch(response.data.watch);
            }
        } catch (error) {
            console.error("Failed to fetch watch config:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlerts = async () => {
        try {
            const response = await apiFetch<ApiEnvelope<{ alerts: CompetitorAlert[] }>>(
                `/ideas/${ideaId}/alerts?limit=50`
            );
            if (response.data) {
                setAlerts(response.data.alerts);
            }
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
        }
    };

    const handleToggleWatch = async () => {
        if (!watch) {
            // Create watch
            try {
                const response = await apiFetch<ApiEnvelope<{ watch: CompetitorWatchType }>>(
                    `/ideas/${ideaId}/competitor-watch`,
                    {
                        method: "POST",
                        body: JSON.stringify({})
                    }
                );
                if (response.data) {
                    setWatch(response.data.watch);
                    toast.success("Competitor watch enabled!");
                }
            } catch (error: any) {
                const errorMsg = error.message || "Failed to enable watch";
                toast.error(errorMsg);
            }
        } else {
            // Toggle active/inactive
            try {
                const response = await apiFetch<ApiEnvelope<{ watch: CompetitorWatchType }>>(
                    `/ideas/${ideaId}/competitor-watch`,
                    {
                        method: "POST",
                        body: JSON.stringify({ is_active: !watch.is_active })
                    }
                );
                if (response.data) {
                    setWatch(response.data.watch);
                    toast.success(response.data.watch.is_active ? "Watch activated" : "Watch paused");
                }
            } catch (error) {
                toast.error("Failed to toggle watch");
            }
        }
    };

    const handleManualScan = async () => {
        setScanning(true);
        try {
            const response = await apiFetch<ApiEnvelope<{ new_alerts: number }>>(
                `/ideas/${ideaId}/competitor-watch/scan`,
                { method: "POST" }
            );
            if (response.data) {
                toast.success(`Scan complete! Found ${response.data.new_alerts} new alerts.`);
                fetchAlerts(); // Refresh alerts
                fetchWatchConfig(); // Update last scan time
            }
        } catch (error) {
            toast.error("Failed to scan competitors");
        } finally {
            setScanning(false);
        }
    };

    const handleMarkAsRead = async (alertId: number) => {
        try {
            await apiFetch(`/ideas/alerts/${alertId}/read`, { method: "PATCH" });
            setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a));
            if (watch) {
                setWatch({ ...watch, unread_alerts_count: Math.max(0, watch.unread_alerts_count - 1) });
            }
        } catch (error) {
            console.error("Failed to mark alert as read");
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'funding': return <DollarSign className="h-3.5 w-3.5" />;
            case 'launch': return <Rocket className="h-3.5 w-3.5" />;
            case 'new_startup': return <TrendingUp className="h-3.5 w-3.5" />;
            default: return <AlertCircle className="h-3.5 w-3.5" />;
        }
    };

    const getAlertColor = (type: string) => {
        switch (type) {
            case 'funding': return 'bg-success/10 text-success border-success/25';
            case 'launch': return 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/25';
            case 'new_startup': return 'bg-brand-violet/10 text-brand-violet border-brand-violet/25';
            default: return 'bg-white/[0.05] text-muted-foreground border-white/10';
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6 max-w-5xl space-y-6 animate-fade-in">
                <div className="space-y-3">
                    <div className="skeleton h-8 w-72" />
                    <div className="skeleton h-4 w-full max-w-lg" />
                </div>
                <div className="skeleton h-64 rounded-2xl" />
                <div className="skeleton h-80 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl animate-fade-up">
            <div className="mb-8">
                <p className="eyebrow mb-2">Live Monitoring</p>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle mb-2">Competitor Watch</h1>
                <p className="text-muted-foreground text-sm">Monitor the market for competitor updates, funding news, and product launches.</p>
            </div>

            {/* Watch Configuration */}
            <div className="card-premium rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-1.5">
                    <div className={cn(
                        "w-9 h-9 rounded-lg border flex items-center justify-center",
                        watch?.is_active
                            ? "bg-gradient-to-br from-brand/25 to-brand-violet/15 border-brand/25"
                            : "bg-white/[0.04] border-white/10"
                    )}>
                        {watch?.is_active ? (
                            <Bell className="h-4 w-4 text-brand-cyan" />
                        ) : (
                            <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                    <div>
                        <h2 className="font-semibold text-base leading-tight">Watch Status</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {watch ? "Monitoring is configured for this idea" : "Set up monitoring to track competitors"}
                        </p>
                    </div>
                </div>
                <div className="space-y-4 mt-5">
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div>
                            <p className="font-medium text-sm">Enable Competitor Monitoring</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {watch?.is_active
                                    ? "Active - Daily scans at 9 AM"
                                    : "Paused - Enable to start tracking"}
                            </p>
                        </div>
                        <Switch
                            checked={watch?.is_active || false}
                            onCheckedChange={handleToggleWatch}
                        />
                    </div>

                    {watch && (
                        <>
                            <div className="border-t border-white/[0.06] pt-4">
                                <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 mb-2.5">Tracked Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {watch.keywords.map((keyword, idx) => (
                                        <span key={idx} className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand/10 border border-brand/25 text-brand-cyan whitespace-normal text-left h-auto max-w-full">
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-white/[0.06] pt-4">
                                <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 mb-2">Last Scan</p>
                                <p className="text-sm text-foreground/85 tabular-nums">
                                    {watch.last_scan_at
                                        ? new Date(watch.last_scan_at).toLocaleString()
                                        : "Never"}
                                </p>
                            </div>

                            <div className="border-t border-white/[0.06] pt-4">
                                <Button
                                    onClick={handleManualScan}
                                    disabled={scanning}
                                    className="w-full rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press"
                                >
                                    {scanning ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Scan Now
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Alerts */}
            <div className="card-premium rounded-2xl p-6">
                <div className="mb-5">
                    <h2 className="font-semibold text-base">Recent Alerts</h2>
                    <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                        {alerts.length} total alerts
                        {watch && watch.unread_alerts_count > 0 && (
                            <span className="ml-2 text-brand-cyan font-medium">
                                • {watch.unread_alerts_count} unread
                            </span>
                        )}
                    </p>
                </div>
                {alerts.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6 opacity-60" />
                        </div>
                        <p className="text-sm">No alerts yet. Enable monitoring to start tracking competitors.</p>
                    </div>
                ) : (
                    <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-4">
                        {alerts.map((alert) => (
                            <motion.div
                                key={alert.id}
                                variants={itemVariants}
                                className={cn(
                                    "p-4 rounded-xl border transition-all",
                                    alert.is_read
                                        ? "bg-white/[0.02] border-white/[0.06]"
                                        : "bg-brand/[0.07] border-brand/25"
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border", getAlertColor(alert.alert_type))}>
                                                {getAlertIcon(alert.alert_type)}
                                                {alert.alert_type.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs font-medium tabular-nums px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground">
                                                {Math.round(alert.relevance_score * 100)}% match
                                            </span>
                                            <span className="text-xs text-muted-foreground/70 tabular-nums">
                                                {new Date(alert.discovered_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-sm mb-1">{alert.title}</h4>
                                        <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{alert.snippet}</p>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={alert.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-brand-cyan hover:text-brand-cyan/80 flex items-center gap-1 transition-colors"
                                            >
                                                Read more <ExternalLink className="h-3 w-3" />
                                            </a>
                                            {!alert.is_read && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMarkAsRead(alert.id)}
                                                    className="text-xs rounded-lg hover:bg-white/[0.06]"
                                                >
                                                    Mark as read
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
