
'use server';

import { getFirestore } from '@/lib/firebase';
import { logProblem } from './problem-service';

const COLLECTION_NAME = 'siteContent';
const ABOUT_PAGE_DOC_ID = 'aboutPage';

export interface AboutPageContent {
    missionStatement?: string;
    // other fields can be added later
}

const defaultContent: AboutPageContent = {
    missionStatement: "Our mission is to simplify the property market. We believe that finding the perfect home or investment should be an exciting and seamless journey, not a complicated chore. By leveraging cutting-edge AI and fostering strong partnerships, we provide a platform that is intelligent, transparent, and user-friendly.",
};

export async function getAboutPageContent(): Promise<AboutPageContent> {
    const firestore = getFirestore();
    if (!firestore) return defaultContent;

    try {
        const docRef = await firestore.collection(COLLECTION_NAME).doc(ABOUT_PAGE_DOC_ID).get();
        if (!docRef.exists) {
            // If the document doesn't exist, create it with default content
            await firestore.collection(COLLECTION_NAME).doc(ABOUT_PAGE_DOC_ID).set(defaultContent);
            return defaultContent;
        }
        return (docRef.data() as AboutPageContent) || defaultContent;
    } catch (error) {
        await logProblem(error, 'getAboutPageContent');
        return defaultContent; // Return default content on error
    }
}

export async function updateAboutPageContent(content: AboutPageContent): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not available');

    try {
        await firestore.collection(COLLECTION_NAME).doc(ABOUT_PAGE_DOC_ID).set(content, { merge: true });
    } catch (error: any) {
        await logProblem(error, 'updateAboutPageContent');
        throw new Error('Failed to update about page content.');
    }
}
