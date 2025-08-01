
import { getUsers } from '@/services/user-service';
import { BlogEditForm } from '@/components/manage/blog-edit-form';

export default async function CreateBlogPage() {
    const users = await getUsers();

    return (
        <div className="max-w-4xl mx-auto">
            <BlogEditForm mode="create" users={users} />
        </div>
    );
}
