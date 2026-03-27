
import { getProblems } from "@/services/problem-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Info, ServerCrash } from "lucide-react";
import { ClearLogsButton } from "@/components/manage/clear-logs-button";
import { Pagination } from "@/components/manage/pagination";

export const dynamic = 'force-dynamic';

const LOGS_PER_PAGE = 20;

export default async function ProblemsPage({
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

  const description = totalCount > 0
    ? `Showing ${problems.length} of ${totalCount} total errors.`
    : `No errors logged.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
          <div>
              <h2 className="text-2xl font-semibold leading-none tracking-tight">Error Logs</h2>
              <p className="text-sm text-muted-foreground">
                  {description}
              </p>
          </div>
          <ClearLogsButton />
      </div>
      <div>
          {problems.length > 0 ? (
              <div className="space-y-4">
                  {problems.map((problem) => (
                      <Alert key={problem.id} variant="destructive">
                          <ServerCrash className="h-4 w-4" />
                          <AlertTitle>Error in: {problem.context}</AlertTitle>
                          <AlertDescription>
                              <p className="font-semibold">{problem.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                  Logged at: {new Date(problem.createdAt).toLocaleString()}
                              </p>
                              {problem.stack && (
                                  <details className="mt-2 text-left">
                                      <summary className="cursor-pointer text-xs font-medium hover:text-foreground">
                                          View Stack Trace
                                      </summary>
                                      <pre className="mt-1 p-2 bg-background/50 rounded-md text-xs whitespace-pre-wrap font-mono break-words">
                                          {problem.stack}
                                      </pre>
                                  </details>
                              )}
                              {problem.details && (
                                  <details className="mt-2 text-left">
                                      <summary className="cursor-pointer text-xs font-medium hover:text-foreground">
                                          View API Call Details
                                      </summary>
                                      <div className="mt-1 p-2 bg-background/50 rounded-md text-xs font-mono">
                                          {Object.entries(problem.details).map(([key, value]) => (
                                              <div key={key} className="mb-2 last:mb-0">
                                                  <p className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</p>
                                                  <pre className="p-2 bg-black/10 dark:bg-white/10 rounded-md whitespace-pre-wrap break-all">
                                                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                  </pre>
                                              </div>
                                          ))}
                                      </div>
                                  </details>
                              )}
                          </AlertDescription>
                      </Alert>
                  ))}
                   {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
              </div>
          ) : (
               <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Errors Logged</AlertTitle>
                  <AlertDescription>
                      The system has not logged any errors yet.
                  </AlertDescription>
              </Alert>
          )}
      </div>
    </div>
  );
}
