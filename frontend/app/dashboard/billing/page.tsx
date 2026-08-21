"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Check, Zap, Crown, Rocket, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/** Pricing comes from GET /api/billing/tiers — the backend is the single
 *  source of truth, so the app and the pitch deck can never drift apart. */
interface Tier {
    id: string;
    label: string;
    currency: string;
    price: number;
    price_display: string;
    credits_per_month: number;
    max_ideas: number;
    max_analyses_per_month: number;
    analyses_display: string;
    agents_allowed: string[];
    premium_models: boolean;
    rag_queries_per_day: number;
    websites_allowed: number;
    recommended: boolean;
}

type Currency = 'USD' | 'PKR';

/** Marketing copy per tier. Every number shown comes from the API above —
 *  these are only the qualitative differentiators from the pricing page. */
const TIER_EXTRAS: Record<string, { icon: React.ElementType; chip: string; accent: string; perks: string[] }> = {
    free: {
        icon: Zap,
        chip: "bg-white/[0.05] border-white/[0.08]",
        accent: "text-muted-foreground",
        perks: ["Core analysis pillars", "Basic PDF report", "Community features"],
    },
    starter: {
        icon: Rocket,
        chip: "bg-gradient-to-br from-brand-cyan/25 to-brand/10 border-brand-cyan/25",
        accent: "text-brand-cyan",
        perks: ["All 14 analysis pillars", "PDF + PPT export", "Competitor Watch", "Email support"],
    },
    pro: {
        icon: Crown,
        chip: "bg-gradient-to-br from-brand-violet/30 to-brand/15 border-brand-violet/25",
        accent: "text-brand-violet",
        perks: ["Premium AI models", "AI website builder", "All 4 AI agents", "Priority support"],
    },
    enterprise: {
        icon: Building2,
        chip: "bg-gradient-to-br from-warning/25 to-warning/5 border-warning/25",
        accent: "text-warning",
        perks: ["White-label reports", "API access", "SLA + dedicated support", "Onboarding assistance"],
    },
};

export default function BillingPage() {
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [currentTier, setCurrentTier] = useState("free");
    const [currency, setCurrency] = useState<Currency>('USD');
    const [loading, setLoading] = useState<string | null>(null);
    const [yearly, setYearly] = useState(false);
    const [isLoadingTiers, setIsLoadingTiers] = useState(true);

    // Default to PKR for visitors in Pakistan; they can still switch.
    useEffect(() => {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (tz === 'Asia/Karachi') setCurrency('PKR');
        } catch { /* fall back to USD */ }
    }, []);

    const loadTiers = useCallback(async (cur: Currency) => {
        setIsLoadingTiers(true);
        try {
            const data = await apiFetch(`/billing/tiers?currency=${cur}`);
            setTiers(data.tiers || []);
        } catch (err) {
            console.error('Failed to load pricing:', err);
        } finally {
            setIsLoadingTiers(false);
        }
    }, []);

    useEffect(() => {
        loadTiers(currency);
    }, [currency, loadTiers]);

    // apiFetch already returns parsed JSON — not a Response.
    useEffect(() => {
        async function loadBalance() {
            try {
                const data = await apiFetch('/billing/balance');
                if (data?.subscription_tier) setCurrentTier(data.subscription_tier);
            } catch (err) {
                console.error('Failed to load balance:', err);
            }
        }
        loadBalance();
    }, []);

    async function handleUpgrade(planKey: string) {
        setLoading(planKey);
        try {
            const data = await apiFetch('/billing/checkout', {
                method: 'POST',
                body: JSON.stringify({ plan: planKey }),
            });
            if (data?.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                toast.error(data?.message || 'This plan is not available yet.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Could not start checkout. Please try again.');
        } finally {
            setLoading(null);
        }
    }

    const fmt = (n: number) =>
        currency === 'PKR' ? `PKR ${n.toLocaleString()}` : `$${n.toLocaleString()}`;

    return (
        <div className="max-w-6xl mx-auto py-8 sm:py-12 px-2 sm:px-6 animate-fade-up">
            {/* ── Header ─────────────────────────────────────────── */}
            <header className="relative text-center mb-12 sm:mb-14">
                <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-24 h-56 w-[520px] max-w-full rounded-full bg-brand/[0.12] blur-[100px]"
                />

                <p className="relative eyebrow mb-4">Billing</p>
                <h1 className="relative text-[1.75rem] sm:text-[2.75rem] font-semibold tracking-[-0.035em] leading-[1.08] text-gradient-subtle">
                    Choose your <span className="accent-serif text-gradient">plan</span>
                </h1>
                <p className="relative text-sm text-muted-foreground mt-3.5 max-w-md mx-auto leading-relaxed mb-8">
                    Credits reset every month. Use them or lose them.
                </p>

                <div className="relative flex flex-wrap items-center justify-center gap-3">
                    {/* Billing period */}
                    <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.05)]">
                        <button
                            onClick={() => setYearly(false)}
                            className={cn(
                                "px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 press",
                                !yearly
                                    ? "bg-white/[0.09] text-foreground shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setYearly(true)}
                            className={cn(
                                "px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 press flex items-center gap-1.5",
                                yearly
                                    ? "bg-brand-violet/15 text-brand-violet shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Yearly <span className="text-[11px] font-medium text-success">Save 17%</span>
                        </button>
                    </div>

                    {/* Currency */}
                    <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.05)]">
                        {(['USD', 'PKR'] as const).map((cur) => (
                            <button
                                key={cur}
                                onClick={() => setCurrency(cur)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-[13px] font-semibold font-mono transition-all duration-200 press",
                                    currency === cur
                                        ? "bg-white/[0.09] text-foreground shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {cur}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* ── Pricing cards ──────────────────────────────────── */}
            {isLoadingTiers ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 items-stretch pt-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="card-premium rounded-2xl p-6 space-y-5">
                            <div className="skeleton h-10 w-10 rounded-xl" />
                            <div className="skeleton h-12 w-28" />
                            <div className="skeleton h-16 w-full rounded-xl" />
                            <div className="space-y-2.5">
                                {Array.from({ length: 4 }).map((__, j) => (
                                    <div key={j} className="skeleton h-3.5 w-full" />
                                ))}
                            </div>
                            <div className="skeleton h-11 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 items-stretch pt-4 md:pt-5">
                    {tiers.map((tier) => {
                        const extras = TIER_EXTRAS[tier.id] || TIER_EXTRAS.free;
                        const isCurrent = currentTier === tier.id;
                        const isPopular = tier.recommended;
                        const isFree = tier.price === 0;
                        const planKey = isFree ? null : `${tier.id}_${yearly ? 'yearly' : 'monthly'}`;

                        // Annual billing gives two months free (spec §3.2).
                        const displayPrice = isFree
                            ? 'Free'
                            : yearly
                                ? fmt(tier.price * 10)
                                : tier.price_display;

                        return (
                            <div
                                key={tier.id}
                                className={cn(
                                    "relative flex rounded-2xl",
                                    isPopular && "lg:-translate-y-3 lg:z-10"
                                )}
                            >
                                {isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 rounded-full bg-brand text-white text-[10px] font-mono font-semibold uppercase tracking-[0.14em] whitespace-nowrap shadow-[0_0_16px_oklch(0.585_0.222_277/0.55)]">
                                        Most Popular
                                    </div>
                                )}

                                <div
                                    className={cn(
                                        "relative flex flex-col w-full rounded-2xl p-6",
                                        isPopular
                                            ? "border-gradient shadow-[0_40px_90px_-40px_oklch(0.585_0.222_277/0.55)]"
                                            : "card-premium card-premium-hover"
                                    )}
                                >
                                    {isPopular && (
                                        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                                            <span className="absolute inset-0 bg-[linear-gradient(to_bottom,oklch(1_0_0_/_0.055),transparent_45%)]" />
                                            <span className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-64 rounded-full bg-brand/20 blur-[60px]" />
                                        </span>
                                    )}

                                    {/* Plan name */}
                                    <div className="relative flex items-center justify-between gap-3 mb-5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={cn(
                                                    "h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.08)]",
                                                    extras.chip
                                                )}
                                            >
                                                <extras.icon className={cn("h-[18px] w-[18px]", extras.accent)} />
                                            </div>
                                            <span className="text-lg font-semibold tracking-tight truncate">{tier.label}</span>
                                        </div>

                                        {isCurrent && (
                                            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.14em] px-2 py-1 rounded-full bg-success/10 text-success border border-success/25 shrink-0">
                                                Active
                                            </span>
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div className="relative flex items-baseline gap-1.5 flex-wrap">
                                        <span className="text-[2.5rem] leading-[0.9] font-semibold tracking-[-0.05em] tabular-nums text-gradient-subtle">
                                            {displayPrice}
                                        </span>
                                        {!isFree && (
                                            <span className="text-sm text-muted-foreground/70">
                                                {yearly ? '/year' : '/month'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Allowance */}
                                    <div className="relative mt-6 grid grid-cols-2 rounded-xl border border-white/[0.06] bg-white/[0.02] divide-x divide-white/[0.06] overflow-hidden">
                                        <div className="px-4 py-3">
                                            <p className="text-[9px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                                                Credits
                                            </p>
                                            <p className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight leading-none">
                                                {tier.credits_per_month.toLocaleString()}
                                                <span className="text-[11px] font-normal text-muted-foreground/60 ml-1">/mo</span>
                                            </p>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-[9px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                                                Ideas
                                            </p>
                                            <p className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight leading-none">
                                                {tier.max_ideas.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Features — numbers from the API, copy from TIER_EXTRAS */}
                                    <ul className="relative mt-6 mb-7 space-y-3 flex-1">
                                        {[tier.analyses_display, ...extras.perks].map((f, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-[13px] text-foreground/85 leading-relaxed">
                                                <span
                                                    className={cn(
                                                        "mt-[1px] h-[18px] w-[18px] rounded-md flex items-center justify-center shrink-0 border",
                                                        isPopular
                                                            ? "bg-brand/15 border-brand/25"
                                                            : "bg-success/10 border-success/20"
                                                    )}
                                                >
                                                    <Check className={cn("h-3 w-3", isPopular ? "text-brand-cyan" : "text-success")} />
                                                </span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        disabled={isCurrent || isFree || loading !== null}
                                        onClick={() => planKey && handleUpgrade(planKey)}
                                        className={cn(
                                            "relative w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200",
                                            isCurrent || isFree
                                                ? "border border-white/10 bg-transparent text-muted-foreground/60 cursor-default"
                                                : isPopular
                                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground glow-primary shimmer press cursor-pointer"
                                                    : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-foreground press cursor-pointer",
                                            loading && "opacity-70"
                                        )}
                                    >
                                        {loading === planKey ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                                        ) : isCurrent ? (
                                            'Current Plan'
                                        ) : isFree ? (
                                            'Always free'
                                        ) : (
                                            <>Upgrade <ArrowRight className="h-3.5 w-3.5" /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-center text-xs text-muted-foreground/60 mt-10 max-w-lg mx-auto leading-relaxed">
                {currency === 'PKR'
                    ? 'PKR pricing is for customers in Pakistan. Switch to USD for international billing.'
                    : 'Prices in USD. Customers in Pakistan can switch to PKR pricing above.'}
            </p>
        </div>
    );
}
