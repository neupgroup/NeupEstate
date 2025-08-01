
import { getAgencyById } from "@/services/agency-service";
import { notFound } from "next/navigation";
import { EditAgencyForm } from "@/components/manage/edit-agency-form";

export default async function EditAgencyPage({ params }: { params: { id: string }}) {
    const agency = await getAgencyById(params.id);

    if (!agency) {
        notFound();
    }

    return (
        <EditAgencyForm agency={agency} />
    );
}
