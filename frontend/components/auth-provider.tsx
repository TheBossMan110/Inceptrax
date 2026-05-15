"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface AuthContextType {
    user: any;
    login: (user: any, token?: string, refreshToken?: string) => void;
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

    // On mount: verify auth by calling /auth/me (token sent via Bearer header)
    useEffect(() => {
        async function checkAuth() {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    setUser(null);
                    setLoading(false);
                    return;
                }

                const data = await apiFetch('/auth/me');
                setUser(data.user);
                document.cookie = 'auth_session=true; path=/; max-age=604800; SameSite=Lax';
            } catch {
                // Token is invalid/expired — clear it
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
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

    const login = (newUser: any, token?: string, refreshToken?: string) => {
        // Store tokens in localStorage for cross-domain auth
        if (token) {
            localStorage.setItem('access_token', token);
        }
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }

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
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch {
            // Proceed with local logout even if API call fails
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
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
