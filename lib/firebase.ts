import admin from 'firebase-admin';

let app: admin.app.App;

function initializeAdminApp(): admin.app.App {
    if (admin.apps.length > 0 && admin.apps[0]) {
        return admin.apps[0];
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountJson) {
        throw new Error("SETUP: FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
        throw new Error("SETUP: Failed to parse FIREBASE_SERVICE_ACCOUNT. Please ensure it's a valid JSON string.");
    }

    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error: any) {
        if (error.code === 'auth/invalid-credential' || (error.message && error.message.includes('credential'))) {
            throw new Error('AUTHENTICATION_ERROR: Firebase authentication failed. The credentials in your .env file are incorrect. Please verify them.');
        }
        throw error;
    }
}

function getAdminApp(): admin.app.App {
    if (!app) {
        app = initializeAdminApp();
    }
    return app;
}

export function getFirestore() {
    try {
        if (process.env.DATABASE_PROVIDER !== 'firebase') {
            return null;
        }

        const adminApp = getAdminApp();
        return adminApp.firestore();
    } catch (error) {
        const firebaseError = error as Error;
        if (!firebaseError.message.startsWith("SETUP:") && !firebaseError.message.startsWith("AUTHENTICATION_ERROR:")) {
            console.error("Critical Firebase Error:", firebaseError.message);
        }
        if (firebaseError.message.startsWith("AUTHENTICATION_ERROR:") || firebaseError.message.startsWith("SETUP:")) {
            console.error(firebaseError.message);
        }
        return null;
    }
}
