"use client"

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, BellOff, TrendingUp, Rocket, DollarSign, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { CompetitorWatch as CompetitorWatchType, CompetitorAlert } from "@/types/competitor";

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
            const response = await apiFetch<{ watch: CompetitorWatchType | null; has_watch: boolean }>(
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
            const response = await apiFetch<{ alerts: CompetitorAlert[] }>(
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
                const response = await apiFetch<{ watch: CompetitorWatchType }>(
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
                const response = await apiFetch<{ watch: CompetitorWatchType }>(
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
            const response = await apiFetch<{ new_alerts: number }>(
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
            case 'funding': return <DollarSign className="h-4 w-4" />;
            case 'launch': return <Rocket className="h-4 w-4" />;
            case 'new_startup': return <TrendingUp className="h-4 w-4" />;
            default: return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getAlertColor = (type: string) => {
        switch (type) {
            case 'funding': return 'bg-green-100 text-green-700 border-green-200';
            case 'launch': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'new_startup': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Competitor Watch</h1>
                <p className="text-slate-600">Monitor the market for competitor updates, funding news, and product launches.</p>
            </div>

            {/* Watch Configuration */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {watch?.is_active ? (
                            <Bell className="h-5 w-5 text-indigo-600" />
                        ) : (
                            <BellOff className="h-5 w-5 text-slate-400" />
                        )}
                        Watch Status
                    </CardTitle>
                    <CardDescription>
                        {watch ? "Monitoring is configured for this idea" : "Set up monitoring to track competitors"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Enable Competitor Monitoring</p>
                            <p className="text-sm text-slate-500">
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
                            <div className="border-t pt-4">
                                <p className="text-sm font-medium mb-2">Tracked Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {watch.keywords.map((keyword, idx) => (
                                        <Badge key={idx} variant="outline" className="whitespace-normal text-left h-auto py-1 max-w-full">
                                            {keyword}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-sm font-medium mb-2">Last Scan</p>
                                <p className="text-sm text-slate-600">
                                    {watch.last_scan_at
                                        ? new Date(watch.last_scan_at).toLocaleString()
                                        : "Never"}
                                </p>
                            </div>

                            <div className="border-t pt-4">
                                <Button
                                    onClick={handleManualScan}
                                    disabled={scanning}
                                    className="w-full"
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
                </CardContent>
            </Card>

            {/* Alerts */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Alerts</CardTitle>
                    <CardDescription>
                        {alerts.length} total alerts
                        {watch && watch.unread_alerts_count > 0 && (
                            <span className="ml-2 text-indigo-600 font-medium">
                                • {watch.unread_alerts_count} unread
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {alerts.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No alerts yet. Enable monitoring to start tracking competitors.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-4 rounded-lg border-2 transition-all ${alert.is_read
                                        ? 'bg-white border-slate-100'
                                        : 'bg-indigo-50 border-indigo-200'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className={`${getAlertColor(alert.alert_type)} border`}>
                                                    <span className="flex items-center gap-1">
                                                        {getAlertIcon(alert.alert_type)}
                                                        {alert.alert_type.replace('_', ' ')}
                                                    </span>
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    {Math.round(alert.relevance_score * 100)}% match
                                                </Badge>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(alert.discovered_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="font-medium mb-1">{alert.title}</h4>
                                            <p className="text-sm text-slate-600 mb-2">{alert.snippet}</p>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={alert.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                                >
                                                    Read more <ExternalLink className="h-3 w-3" />
                                                </a>
                                                {!alert.is_read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleMarkAsRead(alert.id)}
                                                        className="text-xs"
                                                    >
                                                        Mark as read
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
