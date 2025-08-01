
import { getUsers } from "@/services/user-service";
import { CreateTeamMemberForm } from "@/components/manage/create-team-member-form";

export default async function CreateTeamMemberPage() {
    const users = await getUsers();

    return (
        <CreateTeamMemberForm users={users} />
    );
}
