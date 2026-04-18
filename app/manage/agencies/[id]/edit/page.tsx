
import { getAgencyById } from "@/services/agency-service";
import { notFound } from "next/navigation";
import { EditAgencyForm } from "@/components/manage/edit-agency-form";

export default async function EditAgencyPage({ params }: { params: Promise<{ id: string }>}) {
    const { id } = await params;
    const agency = await getAgencyById(id);

    if (!agency) {
        notFound();
    }

    return (
        <EditAgencyForm agency={agency} />
    );
}
