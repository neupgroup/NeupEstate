import { getProblems } from "@/services/problem-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ServerCrash } from "lucide-react";
import { ClearLogsButton } from "@/components/manage/clear-logs-button";
import { Pagination } from "@/components/manage/pagination";

export const dynamic = 'force-dynamic';

const LOGS_PER_PAGE = 20;

export default async function SiteErrorsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const offset = (currentPage - 1) * LOGS_PER_PAGE;

  const { problems, totalCount } = await getProblems({
    limit: LOGS_PER_PAGE,
    offset,
  });

  const totalPages = Math.ceil(totalCount / LOGS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Site Errors</h2>
          <p className="text-sm text-muted-foreground">
            {totalCount > 0
              ? `Showing ${problems.length} of ${totalCount} total application errors.`
              : 'No application errors logged.'}
          </p>
        </div>
        <ClearLogsButton />
      </div>

      {problems.length > 0 ? (
        <div className="space-y-4">
          {problems.map((problem) => (
            <Alert key={problem.id} variant="destructive">
              <ServerCrash className="h-4 w-4" />
              <AlertTitle>Error in: {problem.context}</AlertTitle>
              <AlertDescription className="min-w-0">
                <p className="font-semibold whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {problem.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Logged at: {new Date(problem.createdAt).toLocaleString()}
                </p>
                {problem.stack ? (
                  <details className="mt-2 text-left">
                    <summary className="cursor-pointer text-xs font-medium hover:text-foreground">
                      View stack trace
                    </summary>
                    <pre className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-md bg-background/50 p-2 text-xs font-mono">
                      {problem.stack}
                    </pre>
                  </details>
                ) : null}
                {problem.details ? (
                  <details className="mt-2 text-left">
                    <summary className="cursor-pointer text-xs font-medium hover:text-foreground">
                      View error details
                    </summary>
                    <pre className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-md bg-background/50 p-2 text-xs font-mono">
                      {JSON.stringify(problem.details, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </AlertDescription>
            </Alert>
          ))}

          {totalPages > 1 ? <Pagination currentPage={currentPage} totalPages={totalPages} /> : null}
        </div>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No errors logged</AlertTitle>
          <AlertDescription>The system has not logged any application errors yet.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
