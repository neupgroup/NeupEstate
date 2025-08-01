
import { getBlogById } from '@/services/blog-service';
import { getUsers } from '@/services/user-service';
import { notFound } from 'next/navigation';
import { BlogEditForm } from '@/components/manage/blog-edit-form';

export default async function EditBlogPage({ params }: { params: { id: string } }) {
    const blog = await getBlogById(params.id);
    const users = await getUsers();

    if (!blog) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto">
            <BlogEditForm mode="edit" blog={blog} users={users} />
        </div>
    );
}
