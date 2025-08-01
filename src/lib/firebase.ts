
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
    } catch (e) {
        throw new Error("SETUP: Failed to parse FIREBASE_SERVICE_ACCOUNT. Please ensure it's a valid JSON string.");
    }

    // Replace literal \n with actual newlines in private_key
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
            return null; // Don't try to connect if another provider is selected
        }
        const adminApp = getAdminApp();
        return adminApp.firestore();
    } catch (e) {
        const error = e as Error;
        if (!error.message.startsWith("SETUP:") && !error.message.startsWith("AUTHENTICATION_ERROR:")) {
            console.error("Critical Firebase Error:", error.message);
        }
        if (error.message.startsWith("AUTHENTICATION_ERROR:") || error.message.startsWith("SETUP:")) {
            console.error(error.message);
        }
        return null;
    }
}
