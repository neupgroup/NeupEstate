
import { z } from 'zod';

export const BlogStatusSchema = z.enum(['draft', 'published']);
export type BlogStatus = z.infer<typeof BlogStatusSchema>;

export interface Blog {
    id: string;
    title: string;
    slug: string;
    content: string; // Markdown content
    excerpt?: string;
    featuredImageUrl?: string;
    authorId: string;
    authorName: string; // Denormalized for easy display
    authorAvatarUrl?: string; // Denormalized
    tags: string[];
    status: BlogStatus;
    createdAt: string; // ISO String
    updatedAt: string; // ISO String
    publishedAt?: string; // ISO String
}

export const CreateBlogSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters long."),
    content: z.string().min(50, "Content must be at least 50 characters long."),
    excerpt: z.string().max(200, "Excerpt cannot be longer than 200 characters.").optional(),
    featuredImageUrl: z.string().url("Please enter a valid URL for the featured image.").optional().or(z.literal('')),
    tags: z.string().optional(), // Comma-separated tags
    authorId: z.string().min(1, "An author must be selected."),
    status: BlogStatusSchema.default('draft'),
});
export type CreateBlogFormValues = z.infer<typeof CreateBlogSchema>;

export const UpdateBlogSchema = CreateBlogSchema.extend({
    id: z.string(),
});
export type UpdateBlogFormValues = z.infer<typeof UpdateBlogSchema>;
