"use client";

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CreditData {
    credit_balance: number;
    subscription_tier: string;
    credits_per_month: number;
    max_ideas: number;
}

export function CreditBalanceWidget() {
    const [data, setData] = useState<CreditData | null>(null);

    useEffect(() => {
        async function fetchBalance() {
            try {
                // apiFetch returns parsed JSON, not a Response.
                const json = await apiFetch('/billing/balance');
                if (json?.subscription_tier) setData(json);
            } catch (e) {
                // Silently fail — widget is non-critical
            }
        }
        fetchBalance();
    }, []);

    if (!data) return null;

    const tierChip: Record<string, string> = {
        free: "bg-white/[0.06] text-muted-foreground border-white/[0.08]",
        starter: "bg-brand-cyan/15 text-brand-cyan border-brand-cyan/25",
        pro: "bg-brand-violet/15 text-brand-violet border-brand-violet/25",
        enterprise: "bg-warning/15 text-warning border-warning/25",
        team: "bg-warning/15 text-warning border-warning/25", // legacy
    };
    const chipClass = tierChip[data.subscription_tier] || tierChip.free;
    const pct = Math.min((data.credit_balance / data.credits_per_month) * 100, 100);

    return (
        <div className="card-premium rounded-xl px-4 py-3 mb-2">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                    Credits
                </span>
                <span
                    className={cn(
                        "text-[9px] font-mono font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border",
                        chipClass
                    )}
                >
                    {data.subscription_tier}
                </span>
            </div>

            <div className="flex items-baseline gap-1 mb-2.5">
                <span className="text-xl font-bold font-mono tabular-nums leading-none text-foreground">
                    {data.credit_balance}
                </span>
                <span className="text-xs font-mono tabular-nums text-muted-foreground/60">
                    / {data.credits_per_month}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-[width] duration-500 ease-out",
                        pct > 20
                            ? "bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
                            : "bg-danger"
                    )}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
