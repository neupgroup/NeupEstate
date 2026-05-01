
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { logUserActivity } from '@/app/actions';
import type { PropertyActivityEvent } from '@/types';
import { getActiveAccount } from '@/services/account/getAccount';

const ACTIVE_TIME_INTERVAL = 5000;
const INACTIVITY_TIMEOUT = 60000;
const GEOLOCATION_TIMEOUT = 120000;
const TEMP_COOKIE = 'temp_account_id';
const AUTH_COOKIE = 'auth_accounts';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let c of ca) {
    c = c.trim();
    if (c.startsWith(nameEQ)) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

function getAccountId(): string | null {
  const active = getActiveAccount(getCookie(AUTH_COOKIE));
  if (active) return active.aid;
  return getCookie(TEMP_COOKIE);
}

export function ActivityTracker() {
    const pathname = usePathname();
    const activityEvents = useRef<PropertyActivityEvent[]>([]);
    const lastActivityTime = useRef<number>(Date.now());
    const permissionRequested = useRef(false);
    const [isBrowser, setIsBrowser] = useState(false);
    
    const pageViewRef = useRef<{ path: string; startTime: number; activeDuration: number }>({
        path: '',
        startTime: 0,
        activeDuration: 0,
    });

    const propertyId = pathname.startsWith('/properties/') ? pathname.split('/')[2] : undefined;

    const sendData = useCallback(async () => {
        const userId = getAccountId();
        if (!userId) return;

        const now = Date.now();
        const { path, startTime, activeDuration } = pageViewRef.current;
        if (path && now > startTime) {
            const finalDuration = activeDuration;
            if (finalDuration > 0) {
                activityEvents.current.push({ type: 'page_view', page: path, duration: Math.round(finalDuration / 1000) });
            }
        }
        
        if (activityEvents.current.length > 0) {
            await logUserActivity(userId, activityEvents.current, propertyId);
            activityEvents.current = [];
        }

        pageViewRef.current = { path: pathname, startTime: now, activeDuration: 0 };

    }, [propertyId, pathname]);

    const handleUserActivity = useCallback(() => {
        lastActivityTime.current = Date.now();
    }, []);

    const requestGeolocation = useCallback(() => {
        if (permissionRequested.current || typeof window === 'undefined' || !('geolocation' in navigator)) {
            return;
        }
        permissionRequested.current = true; // Mark as requested to prevent repeated prompts

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('User location acquired:', position.coords.latitude, position.coords.longitude);
                // TODO: Send location data to server to enhance user experience
            },
            (error) => {
                console.warn(`Geolocation error: ${error.message}`);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    useEffect(() => {
        setIsBrowser(true);
        pageViewRef.current = { path: pathname, startTime: Date.now(), activeDuration: 0 };
    }, []);

    useEffect(() => {
        if (!isBrowser) return;

        sendData();

        // Specific condition for property page
        if (pathname.startsWith('/properties/')) {
            requestGeolocation();
        }

    }, [isBrowser, pathname, sendData, requestGeolocation]);

    useEffect(() => {
        if (!isBrowser) return;
        
        const checkActivity = () => {
            if (Date.now() - lastActivityTime.current < INACTIVITY_TIMEOUT) {
                pageViewRef.current.activeDuration += ACTIVE_TIME_INTERVAL;
            }
        };
        const interval = setInterval(checkActivity, ACTIVE_TIME_INTERVAL);

        // General 2-minute timeout for any page
        const geolocationTimer = setTimeout(() => {
            requestGeolocation();
        }, GEOLOCATION_TIMEOUT);

        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);

        const handleBeforeUnload = () => {
            sendData();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            clearTimeout(geolocationTimer);
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            sendData(); 
        };
    }, [isBrowser, handleUserActivity, sendData, requestGeolocation]);

    return null;
}
