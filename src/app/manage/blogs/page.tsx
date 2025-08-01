
import { getBlogs } from '@/services/blog-service';
import { getUsers } from '@/services/user-service';
import { BlogListClient } from '@/components/manage/blog-list-client';

export const dynamic = 'force-dynamic';

export default async function ManageBlogsPage() {
    const blogs = await getBlogs();
    const users = await getUsers();
    
    return <BlogListClient blogs={blogs} users={users} />;
}
