
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteBlogAction } from '@/app/actions';
import { ClientLink } from '@/components/client-link';
import { PlusCircle, Pencil, Trash2, Book, Loader2 } from 'lucide-react';
import type { Blog, User } from '@/types';
import { cn } from '@/lib/utils';

interface BlogListClientProps {
    blogs: Blog[];
    users: User[];
}

function getInitials(name: string) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function BlogListClient({ blogs, users }: BlogListClientProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, startDeleteTransition] = useTransition();

    const handleDelete = (blog: Blog) => {
        startDeleteTransition(async () => {
            const result = await deleteBlogAction(blog.id);
            if(result.success) {
                toast({ title: "Blog Post Deleted", description: `The post "${blog.title}" has been deleted.` });
            } else {
                toast({ variant: 'destructive', title: 'Error deleting post', description: result.error });
            }
        });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Blog Management</CardTitle>
                    <CardDescription>{blogs.length} posts found. Manage your articles here.</CardDescription>
                </div>
                <ClientLink href="/manage/blogs/create" className={buttonVariants({ variant: 'default' })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Post
                </ClientLink>
            </CardHeader>
            <CardContent>
                {blogs.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blogs.map(blog => (
                                <TableRow key={blog.id}>
                                    <TableCell className="font-medium">{blog.title}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={blog.authorAvatarUrl} alt={blog.authorName} />
                                                <AvatarFallback>{getInitials(blog.authorName)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">{blog.authorName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={blog.status === 'published' ? 'default' : 'secondary'}>
                                            {blog.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(blog.updatedAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ClientLink href={`/manage/blogs/${blog.id}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                                            <Pencil className="h-4 w-4" />
                                        </ClientLink>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete this blog post.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(blog)} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Alert>
                        <Book className="h-4 w-4" />
                        <AlertTitle>No Blog Posts Found</AlertTitle>
                        <AlertDescription>
                            Get started by creating your first blog post.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
