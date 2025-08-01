

'use server';

import { getFirestore } from '@/lib/firebase';
import type { Conversation, Message, CreateConversationInput } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

function toConversation(doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>): Conversation {
    const data = doc.data()!;
    return {
        id: doc.id,
        userId: data.userId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerAvatarUrl: data.customerAvatarUrl,
        notes: data.notes,
        assignedTo: data.assignedTo,
        lastMessageAt: data.lastMessageAt.toDate().toISOString(),
        isRead: data.isRead,
        subject: data.subject,
        lastMessageSnippet: data.lastMessageSnippet,
        lastMessageSender: data.lastMessageSender,
        // New AI fields
        leadCategory: data.leadCategory,
        leadScore: data.leadScore,
        aiInterventionActive: data.aiInterventionActive ?? true, // Default to true if not set
    };
}

function toMessage(doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>): Message {
     const data = doc.data()!;
    return {
        id: doc.id,
        conversationId: data.conversationId,
        sender: data.sender,
        text: data.text,
        timestamp: data.timestamp.toDate().toISOString(),
    };
}


export async function getConversations({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Conversation[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection('conversations').orderBy('lastMessageAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(toConversation);
    } catch (error) {
        console.error('Error getting conversations:', error);
        return [];
    }
}


export async function getConversationById(id: string): Promise<Conversation | null> {
    const firestore = getFirestore();
    if (!firestore) return null;
    try {
        const docRef = await firestore.collection('conversations').doc(id).get();
        if (!docRef.exists) return null;
        
        // Mark as read when it's fetched by a human
        if (docRef.data()?.isRead === false) {
            await docRef.ref.update({ isRead: true });
        }

        return toConversation(docRef);
    } catch (error) {
        console.error(`Error getting conversation by id ${id}:`, error);
        return null;
    }
}

export async function getConversationByPhone(phone: string): Promise<Conversation | null> {
    const firestore = getFirestore();
    if (!firestore) return null;

    try {
        const snapshot = await firestore.collection('conversations')
            .where('customerPhone', '==', phone)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }
        
        return toConversation(snapshot.docs[0]);
    } catch (error) {
        console.error(`Error getting conversation by phone ${phone}:`, error);
        return null;
    }
}

export async function getConversationByAccountId(accountId: string): Promise<Conversation | null> {
    const firestore = getFirestore();
    if (!firestore) return null;

    try {
        const snapshot = await firestore.collection('conversations')
            .where('userId', '==', accountId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }
        
        return toConversation(snapshot.docs[0]);
    } catch (error) {
        console.error(`Error getting conversation by account ID ${accountId}:`, error);
        return null;
    }
}


export async function getMessagesByConversationId(conversationId: string, { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Message[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection('conversations').doc(conversationId).collection('messages').orderBy('timestamp', 'asc').limit(limit).offset(offset).get();
        return snapshot.docs.map(toMessage);
    } catch (error) {
        console.error(`Error getting messages for conversation ${conversationId}:`, error);
        return [];
    }
}

export async function createMessage(conversationId: string, text: string, sender: 'agent' | 'customer'): Promise<Message> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available');

    const conversationRef = firestore.collection('conversations').doc(conversationId);
    const messagesRef = conversationRef.collection('messages');

    const newMessageData = {
        conversationId,
        text,
        sender,
        timestamp: new Date(),
    };

    const docRef = await messagesRef.add(newMessageData);
    
    // Only update if the message is from a customer, or if an agent sends a manual message
    // This prevents the AI's own messages from overwriting the last customer message snippet
    if (sender === 'customer' || sender === 'agent') {
        await conversationRef.update({
            lastMessageAt: new Date(),
            lastMessageSnippet: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            lastMessageSender: sender,
            // A message from a customer makes it unread. A message from an agent makes it read.
            isRead: sender === 'customer' ? false : true,
        });
    }
    
    const messageDoc = await docRef.get();
    return toMessage(messageDoc);
}


export async function createConversation(input: CreateConversationInput): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available');

    const newConversationData = {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: '', // Not collected in the form for now
        customerAvatarUrl: `https://placehold.co/40x40.png`, // Placeholder avatar
        notes: input.notes,
        subject: input.notes, // Use notes as the initial subject
        assignedTo: 'AI Assistant', // Initial assignment
        isRead: true, // It's read by the AI, but will become unread for humans
        lastMessageAt: new Date(),
        lastMessageSnippet: "Conversation created. Send a template to start.",
        lastMessageSender: 'agent',
        // New AI fields
        leadCategory: 'New Inquiry',
        leadScore: 5, // Default score
        aiInterventionActive: true,
        userId: input.userId, // Link to account ID
    };

    const docRef = await firestore.collection('conversations').add(newConversationData);
    return docRef.id;
}


export async function deleteConversation(conversationId: string): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available');

    const conversationRef = firestore.collection('conversations').doc(conversationId);
    const messagesRef = conversationRef.collection('messages');
    
    // Delete all messages in the subcollection
    const messagesSnapshot = await messagesRef.limit(500).get(); // Batch delete
    const batch = firestore.batch();
    messagesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // Delete the conversation document itself
    batch.delete(conversationRef);

    await batch.commit();
}

export async function updateConversationAiStatus(
  conversationId: string,
  status: { leadCategory: string; leadScore: number; aiInterventionActive: boolean }
): Promise<void> {
  const firestore = getFirestore();
  if (!firestore) throw new Error('Firestore is not available');
  const conversationRef = firestore.collection('conversations').doc(conversationId);
  await conversationRef.update({
    ...status,
    assignedTo: status.aiInterventionActive ? 'AI Assistant' : 'Admin',
  });
}

export async function setAiIntervention(conversationId: string, active: boolean): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available');
    const conversationRef = firestore.collection('conversations').doc(conversationId);
    await conversationRef.update({ 
        aiInterventionActive: active,
        assignedTo: active ? 'AI Assistant' : 'Admin'
    });
}

    
