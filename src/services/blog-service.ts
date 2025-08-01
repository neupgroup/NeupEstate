
'use server';

import { getFirestore } from '@/lib/firebase';
import { logProblem } from './problem-service';
import type { Blog, CreateBlogFormValues, UpdateBlogFormValues } from '@/types';
import { getUsers } from './user-service';
import slugify from 'slugify';

const COLLECTION_NAME = 'blogs';

function toBlog(doc: FirebaseFirestore.DocumentSnapshot): Blog {
    const data = doc.data()!;
    return {
        id: doc.id,
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        featuredImageUrl: data.featuredImageUrl,
        authorId: data.authorId,
        authorName: data.authorName,
        authorAvatarUrl: data.authorAvatarUrl,
        tags: data.tags || [],
        status: data.status,
        createdAt: data.createdAt.toDate().toISOString(),
        updatedAt: data.updatedAt.toDate().toISOString(),
        publishedAt: data.publishedAt ? data.publishedAt.toDate().toISOString() : undefined,
    };
}

export async function getBlogs({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Blog[]> {
    const firestore = getFirestore();
    if (!firestore) return [];

    try {
        const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(toBlog);
    } catch (error) {
        await logProblem(error, 'getBlogs');
        return [];
    }
}

export async function getBlogById(id: string): Promise<Blog | null> {
    const firestore = getFirestore();
    if (!firestore) return null;
    try {
        const docRef = await firestore.collection(COLLECTION_NAME).doc(id).get();
        if (!docRef.exists) return null;
        return toBlog(docRef);
    } catch (error) {
        await logProblem(error, `getBlogById (ID: ${id})`);
        return null;
    }
}

async function generateUniqueSlug(title: string, currentId?: string): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) throw new Error("Firestore not available");
    
    let baseSlug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    let finalSlug = baseSlug;
    let attempt = 1;

    let isUnique = false;
    while (!isUnique) {
        let querySnapshot;
        if (currentId) {
            querySnapshot = await firestore.collection(COLLECTION_NAME)
                .where('slug', '==', finalSlug)
                .where(firestore.FieldPath.documentId(), '!=', currentId)
                .get();
        } else {
            querySnapshot = await firestore.collection(COLLECTION_NAME).where('slug', '==', finalSlug).get();
        }

        if (querySnapshot.empty) {
            isUnique = true;
        } else {
            attempt++;
            finalSlug = `${baseSlug}-${attempt}`;
        }
    }
    return finalSlug;
}

export async function createBlog(data: CreateBlogFormValues): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) throw new Error("Firestore not available");

    const users = await getUsers();
    const author = users.find(u => u.id === data.authorId);
    if (!author) throw new Error("Author not found");

    const slug = await generateUniqueSlug(data.title);

    const dataToSave = {
        ...data,
        slug,
        authorName: author.name,
        authorAvatarUrl: author.avatarUrl,
        tags: data.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: data.status === 'published' ? new Date() : null,
    };
    
    const docRef = await firestore.collection(COLLECTION_NAME).add(dataToSave);
    return docRef.id;
}

export async function updateBlog(id: string, data: UpdateBlogFormValues): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error("Firestore not available");

    const docRef = firestore.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Blog post not found");
    const existingData = docSnap.data() as Blog;

    const slug = await generateUniqueSlug(data.title, id);

    const dataToUpdate = {
        ...data,
        slug,
        tags: data.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
        updatedAt: new Date(),
        publishedAt: data.status === 'published' && existingData.status !== 'published' ? new Date() : (existingData.publishedAt ? new Date(existingData.publishedAt) : null),
    };

    await docRef.update(dataToUpdate);
}

export async function deleteBlog(id: string): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error("Firestore not available");
    await firestore.collection(COLLECTION_NAME).doc(id).delete();
}
