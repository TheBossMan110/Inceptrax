"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AuthContextType {
    user: any;
    login: (user: any) => void;
    logout: () => void;
    loading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // On mount: verify auth by calling /auth/me (cookie sent automatically)
    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch(`${API_URL}/auth/me`, {
                    credentials: 'include',  // sends httpOnly cookie
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                    // Set session marker for Next.js middleware (non-sensitive, just a flag)
                    document.cookie = 'auth_session=true; path=/; max-age=604800; SameSite=Lax';
                } else {
                    setUser(null);
                    document.cookie = 'auth_session=; path=/; max-age=0';
                }
            } catch {
                setUser(null);
                document.cookie = 'auth_session=; path=/; max-age=0';
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, []);

    // Client-side redirect for unauthenticated users (backup for middleware)
    useEffect(() => {
        if (!loading) {
            const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/about', '/features', '/contact', '/public-ideas', '/privacy-policy', '/terms-of-service'];
            const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/share/') || pathname.startsWith('/reset-password/');

            if (!user && !isPublicRoute) {
                router.push('/login');
            }
        }
    }, [user, loading, pathname, router]);

    const login = (newUser: any) => {
        // Token is already set as httpOnly cookie by the backend
        // We only store user data for UI rendering
        setUser(newUser);
        document.cookie = 'auth_session=true; path=/; max-age=604800; SameSite=Lax';

        if (newUser.is_admin) {
            router.push('/admin');
        } else {
            router.push('/dashboard');
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',  // sends httpOnly cookie for blacklisting
            });
        } catch {
            // Proceed with local logout even if API call fails
        }
        setUser(null);
        document.cookie = 'auth_session=; path=/; max-age=0';
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
