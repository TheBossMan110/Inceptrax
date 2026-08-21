"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function BillingSuccessPage() {
    const [dots, setDots] = useState('.');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '.' : d + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-10 animate-fade-up">
            <div className="relative mb-6">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full bg-success/20 blur-2xl scale-150"
                />
                <div className="relative w-20 h-20 rounded-full bg-success/10 border border-success/25 flex items-center justify-center shadow-[0_0_40px_oklch(0.72_0.17_160/0.35)]">
                    <CheckCircle className="h-10 w-10 text-success" />
                </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle mb-3">
                Payment <span className="accent-serif text-gradient">successful</span>
            </h1>

            <p className="text-sm text-muted-foreground max-w-sm mb-2 tabular-nums">
                Your subscription is being activated{dots}
            </p>

            <p className="text-xs text-muted-foreground/70 max-w-sm mb-8 leading-relaxed">
                Credits will be added to your account within a few seconds via webhook.
                If they don&apos;t appear, refresh the page.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold glow-primary shimmer press transition-colors"
                >
                    <Sparkles className="h-4 w-4" />
                    Go to Dashboard
                </Link>

                <Link
                    href="/dashboard/new-idea"
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-foreground text-sm font-semibold press transition-colors"
                >
                    Create Idea <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
}
