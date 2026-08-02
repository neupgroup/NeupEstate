
import { getAgentById } from "@/services/agent-service";
import { getUsers } from "@/services/user-service";
import { notFound } from "next/navigation";
import { EditAgentForm } from "@/components/manage/edit-agent-form";

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }>}) {
    const { id } = await params;
    const agent = await getAgentById(id);
    const users = await getUsers();

    if (!agent) {
        notFound();
    }

    return (
        <EditAgentForm agent={agent} users={users} />
    );
}
