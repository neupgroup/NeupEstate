
import { getAgencies } from "@/services/agency-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SafeImage } from "@/components/safe-image";
import { buttonVariants } from "@/components/ui/button";
import { ClientLink } from "@/components/client-link";
import { ApiRequestButton } from "@/components/api-request-button";

export default async function ManageAgenciesPage() {
  const agencies = await getAgencies();

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Agency Management</h2>
            <p className="text-sm text-muted-foreground">
                {agencies.length} agencies found.
            </p>
        </div>
        <div className="flex gap-2">
          <ClientLink href="/manage/agencies/select-brand" className={buttonVariants({ variant: 'outline' })}>
              <Building className="mr-2 h-4 w-4"/>
              Create from Brand
          </ClientLink>
          <ClientLink href="/manage/agencies/create" className={buttonVariants()}>
              <Building className="mr-2 h-4 w-4"/>
              Create Manual
          </ClientLink>
        </div>
      </div>
      
      <ApiRequestButton />
      <div>
        {agencies.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Website</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {agencies.map((agency) => (
                <TableRow key={agency.id}>
                    <TableCell>
                        <SafeImage src={agency.logoUrl} alt={agency.name} width={80} height={32} className="rounded-md object-contain" data-ai-hint="company logo" fallbackSrc="https://placehold.co/80x32.png" />
                    </TableCell>
                    <TableCell className="font-medium">
                        <ClientLink href={`/manage/agencies/${agency.id}/edit`} className="hover:underline">
                            {agency.name}
                        </ClientLink>
                    </TableCell>
                    <TableCell>
                        {agency.website ? (
                            <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {agency.website}
                            </a>
                        ) : (
                            <span className="text-muted-foreground">N/A</span>
                        )}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Agencies Found</AlertTitle>
                <AlertDescription>
                   No agencies were found in the database. You can add one by clicking the button above.
                </AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}
