'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { ListingActivityEvent } from '@/types';
import { makeAppPath } from '@neup/core/appconfig';
import { parseListingSlugId } from '@/services/listings/slug';

const ACTIVE_TIME_INTERVAL = 5000;
const INACTIVITY_TIMEOUT = 60000;
const GEOLOCATION_TIMEOUT = 120000;

export function ActivityTracker() {
    const pathname = usePathname();
    const activityEvents = useRef<ListingActivityEvent[]>([]);
    const lastActivityTime = useRef<number>(0);
    const permissionRequested = useRef(false);

    const pageViewRef = useRef<{ path: string; startTime: number; activeDuration: number }>({
        path: '',
        startTime: 0,
        activeDuration: 0,
    });

    const propertyPathValue = pathname.startsWith('/listings/') ? pathname.split('/')[2] : undefined;
    const propertyId = propertyPathValue ? parseListingSlugId(propertyPathValue)?.id ?? propertyPathValue : undefined;

    const sendData = useCallback(async () => {
        const now = Date.now();
        const { path, startTime, activeDuration } = pageViewRef.current;
        if (path && now > startTime) {
            const finalDuration = activeDuration;
            if (finalDuration > 0) {
                activityEvents.current.push({ type: 'page_view', page: path, duration: Math.round(finalDuration / 1000) });
            }
        }

        if (activityEvents.current.length > 0) {
            try {
                await fetch(makeAppPath('/bridge/api.v1/activities'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events: activityEvents.current, propertyId }),
                });
            } catch {
                // Silently fail - activity tracking should not break the user experience
            }
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
        permissionRequested.current = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
            },
            (error) => {
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    useEffect(() => {
        pageViewRef.current = { path: pathname, startTime: Date.now(), activeDuration: 0 };
        lastActivityTime.current = Date.now();

        sendData();

        if (pathname.startsWith('/listings/')) {
            requestGeolocation();
        }
    }, [pathname, sendData, requestGeolocation]);

    useEffect(() => {
        const checkActivity = () => {
            if (Date.now() - lastActivityTime.current < INACTIVITY_TIMEOUT) {
                pageViewRef.current.activeDuration += ACTIVE_TIME_INTERVAL;
            }
        };
        const interval = setInterval(checkActivity, ACTIVE_TIME_INTERVAL);

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
    }, [handleUserActivity, sendData, requestGeolocation]);

    return null;
}
