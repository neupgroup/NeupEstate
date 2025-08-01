
import { getTeamMemberById } from "@/services/team-service";
import { getUsers } from "@/services/user-service";
import { notFound } from "next/navigation";
import { EditTeamMemberForm } from "@/components/manage/edit-team-member-form";

export default async function EditTeamMemberPage({ params }: { params: { id: string }}) {
    const member = await getTeamMemberById(params.id);
    const users = await getUsers();

    if (!member) {
        notFound();
    }

    return (
        <EditTeamMemberForm member={member} users={users} />
    );
}
