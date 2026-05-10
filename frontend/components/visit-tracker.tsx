"use client";

import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export function VisitTracker() {
  useEffect(() => {
    // Only track once per page session
    const hasTracked = sessionStorage.getItem('inceptrax_visited');
    
    if (!hasTracked) {
      const trackVisit = async () => {
        try {
          await apiFetch('/admin/track-visit', {
            method: 'POST',
          });
          sessionStorage.setItem('inceptrax_visited', 'true');
        } catch (error) {
          // Silently fail, don't interrupt user
          console.error('Visit tracking failed:', error);
        }
      };
      
      trackVisit();
    }
  }, []);

  return null;
}
