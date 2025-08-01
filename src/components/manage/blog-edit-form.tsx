
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { Blog, User, CreateBlogFormValues, UpdateBlogFormValues, BlogStatus } from '@/types';
import { CreateBlogSchema, UpdateBlogSchema, BlogStatusSchema } from '@/types';
import { createBlogAction, updateBlogAction } from '@/app/actions';
import { ClientLink } from '@/components/client-link';
import { cn } from '@/lib/utils';

interface BlogEditFormProps {
    mode: 'create' | 'edit';
    blog?: Blog;
    users: User[];
}

export function BlogEditForm({ mode, blog, users }: BlogEditFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const form = useForm<CreateBlogFormValues | UpdateBlogFormValues>({
        resolver: zodResolver(mode === 'create' ? CreateBlogSchema : UpdateBlogSchema),
        defaultValues: mode === 'create' ? {
            title: '',
            content: '',
            excerpt: '',
            featuredImageUrl: '',
            tags: '',
            authorId: '',
            status: 'draft',
        } : {
            id: blog?.id || '',
            title: blog?.title || '',
            content: blog?.content || '',
            excerpt: blog?.excerpt || '',
            featuredImageUrl: blog?.featuredImageUrl || '',
            tags: blog?.tags?.join(', ') || '',
            authorId: blog?.authorId || '',
            status: blog?.status || 'draft',
        },
    });

    const onSubmit = (values: CreateBlogFormValues | UpdateBlogFormValues) => {
        startTransition(async () => {
            const action = mode === 'create'
                ? createBlogAction(values as CreateBlogFormValues)
                : updateBlogAction(values as UpdateBlogFormValues);
            
            const result = await action;

            if (result.success) {
                toast({ title: `Post ${mode === 'create' ? 'Created' : 'Updated'}` });
                router.push('/manage/blogs');
            } else {
                toast({
                    variant: 'destructive',
                    title: `Error ${mode === 'create' ? 'creating' : 'updating'} post`,
                    description: result.error,
                });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex justify-between items-center">
                    <ClientLink href="/manage/blogs" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4 -ml-4')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Posts
                    </ClientLink>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === 'create' ? 'Publish Post' : 'Save Changes'}
                    </Button>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>{mode === 'create' ? 'Create New Blog Post' : 'Edit Blog Post'}</CardTitle>
                        <CardDescription>Fill in the details for your article.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl><Input placeholder="Your Post Title" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="content" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Content (Markdown Supported)</FormLabel>
                                <FormControl><Textarea placeholder="Write your blog post here..." {...field} rows={15} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Post Details</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                         <FormField control={form.control} name="excerpt" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Excerpt</FormLabel>
                                <FormControl><Textarea placeholder="A short summary of the post..." {...field} rows={3} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="featuredImageUrl" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Featured Image URL</FormLabel>
                                <FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="tags" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tags (comma-separated)</FormLabel>
                                <FormControl><Input placeholder="e.g., real estate, market update, tips" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="authorId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Author</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an author" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {users.map(user => (
                                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value as BlogStatus}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {BlogStatusSchema.options.map(status => (
                                            <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                     </CardContent>
                </Card>
            </form>
        </Form>
    );
}
