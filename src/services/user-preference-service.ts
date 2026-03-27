

'use server';

import { prisma } from '@/lib/prisma';
import type { Property, PropertyActivityEvent, UserPreferences } from '@/types';
import { logProblem } from './problem-service';


const WEIGHTS = {
    view: 1,
    save: 10,
    share: 8,
    call: 15,
    inquiry: 12,
    visit_request: 20,
    mortgage_request: 25,
};

function getBudgetRange(price: number): string {
    const step = 50000;
    const lower = Math.floor(price / step) * step;
    const upper = lower + step;
    return `${lower}-${upper}`;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {

    try {
        let pref = await prisma.userPreference.findUnique({
            where: { accountId: userId },
        });
        
        if (!pref) {
            // Create a new preference record if it doesn't exist
            pref = await prisma.userPreference.create({
                data: {
                    accountId: userId,
                    preferences: {},
                },
            });
        }

        return {
            userId,
            ...pref,
            updatedAt: pref.updatedAt.toISOString(),
            preferences: (pref.preferences as any) || {},
        } as UserPreferences;
    } catch (error) {
        await logProblem(error, `getUserPreferences (User: ${userId})`);
        return null;
    }
}

export async function updateUserPreferences(
    userId: string,
    property: Property,
    events: PropertyActivityEvent[]
): Promise<void> {

    try {
        // Get or create preference document
        let pref = await prisma.userPreference.findUnique({
            where: { accountId: userId },
        });

        if (!pref) {
            pref = await prisma.userPreference.create({
                data: {
                    accountId: userId,
                    preferences: {},
                },
            });
        }
        
        let totalViewDuration = 0;
        let hasPersistentAction = false;
        
        // Parse current preferences
        let prefs = (pref.preferences as any) || {};
        let counters = {
            totalSaves: pref.totalSaves,
            totalCalls: pref.totalCalls,
            totalInquiries: pref.totalInquiries,
            totalVisitRequests: pref.totalVisitRequests,
            totalMortgageRequests: pref.totalMortgageRequests,
            totalShares: pref.totalShares,
            totalTimeSpentInSeconds: pref.totalTimeSpentInSeconds,
        };

        for (const event of events) {
            const weight = WEIGHTS[event.type] || 0;
            if (event.type === 'view') {
                totalViewDuration += event.duration || 0;
            } else {
                hasPersistentAction = true;
                const counterKey = `total${event.type.charAt(0).toUpperCase() + event.type.slice(1).replace(/_/g, '')}s`;
                if (counterKey in counters) {
                    counters[counterKey as keyof typeof counters]++;
                }
            }

            if (weight === 0 && event.type !== 'view') continue;

            // Update location preference
            if (property.location) {
                if (!prefs.location) prefs.location = {};
                if (!prefs.location[property.location]) prefs.location[property.location] = {};
                prefs.location[property.location][event.type] = (prefs.location[property.location][event.type] || 0) + weight;
            }
            // Update district preference
            if ((property as any).structuredLocation?.district) {
                if (!prefs.district) prefs.district = {};
                if (!prefs.district[(property as any).structuredLocation.district]) prefs.district[(property as any).structuredLocation.district] = {};
                prefs.district[(property as any).structuredLocation.district][event.type] = (prefs.district[(property as any).structuredLocation.district][event.type] || 0) + weight;
            }
            // Update budget range preference
            if ((property as any).price > 0) {
                const budgetRange = getBudgetRange((property as any).price);
                if (!prefs.budget_range) prefs.budget_range = {};
                if (!prefs.budget_range[budgetRange]) prefs.budget_range[budgetRange] = {};
                prefs.budget_range[budgetRange][event.type] = (prefs.budget_range[budgetRange][event.type] || 0) + weight;
            }
            // Update type preference
            if ((property as any).type) {
                if (!prefs.type) prefs.type = {};
                if (!prefs.type[(property as any).type]) prefs.type[(property as any).type] = {};
                prefs.type[(property as any).type][event.type] = (prefs.type[(property as any).type][event.type] || 0) + weight;
            }
            // Update category preference
            if ((property as any).category) {
                if (!prefs.category) prefs.category = {};
                if (!prefs.category[(property as any).category]) prefs.category[(property as any).category] = {};
                prefs.category[(property as any).category][event.type] = (prefs.category[(property as any).category][event.type] || 0) + weight;
            }
        }
        
        // Add total view duration to a separate field
        if (totalViewDuration > 0) {
            counters.totalTimeSpentInSeconds += totalViewDuration;
        }

        // Handle view weight calculation based on overall interaction
        if (totalViewDuration >= 60 || (hasPersistentAction && totalViewDuration > 0)) {
            const viewWeight = Math.ceil(totalViewDuration / 60); // 1 point per minute
            if (property.location) {
                if (!prefs.location) prefs.location = {};
                if (!prefs.location[property.location]) prefs.location[property.location] = {};
                prefs.location[property.location].view = (prefs.location[property.location].view || 0) + viewWeight;
            }
            if ((property as any).structuredLocation?.district) {
                if (!prefs.district) prefs.district = {};
                if (!prefs.district[(property as any).structuredLocation.district]) prefs.district[(property as any).structuredLocation.district] = {};
                prefs.district[(property as any).structuredLocation.district].view = (prefs.district[(property as any).structuredLocation.district].view || 0) + viewWeight;
            }
            if ((property as any).price > 0) {
                const budgetRange = getBudgetRange((property as any).price);
                if (!prefs.budget_range) prefs.budget_range = {};
                if (!prefs.budget_range[budgetRange]) prefs.budget_range[budgetRange] = {};
                prefs.budget_range[budgetRange].view = (prefs.budget_range[budgetRange].view || 0) + viewWeight;
            }
            if ((property as any).type) {
                if (!prefs.type) prefs.type = {};
                if (!prefs.type[(property as any).type]) prefs.type[(property as any).type] = {};
                prefs.type[(property as any).type].view = (prefs.type[(property as any).type].view || 0) + viewWeight;
            }
            if ((property as any).category) {
                if (!prefs.category) prefs.category = {};
                if (!prefs.category[(property as any).category]) prefs.category[(property as any).category] = {};
                prefs.category[(property as any).category].view = (prefs.category[(property as any).category].view || 0) + viewWeight;
            }
        }

        // Update preference record in database
        await prisma.userPreference.update({
            where: { accountId: userId },
            data: {
                preferences: prefs,
                totalSaves: counters.totalSaves,
                totalCalls: counters.totalCalls,
                totalInquiries: counters.totalInquiries,
                totalVisitRequests: counters.totalVisitRequests,
                totalMortgageRequests: counters.totalMortgageRequests,
                totalShares: counters.totalShares,
                totalTimeSpentInSeconds: counters.totalTimeSpentInSeconds,
            },
        });

    } catch (error) {
        await logProblem(error, `updateUserPreferences (User: ${userId})`);
    }
}
