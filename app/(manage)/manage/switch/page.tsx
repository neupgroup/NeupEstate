import { ProjectSelector } from '@/components/manage/project-selector';

type SearchParams = Record<string, string | string[] | undefined>;

function getProjectIds(): string[] {
  return Array.from(new Set([
    process.env.DEFAULT_PROJECT,
    ...(process.env.ADDITIONAL_PROJECTS?.split(',') ?? []),
  ].map((project) => project?.trim()).filter((project): project is string => Boolean(project))));
}

export default async function ManageSwitchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const projectValue = resolvedSearchParams.project;
  const selectedProject = (Array.isArray(projectValue) ? projectValue[0] : projectValue)?.trim() || null;
  const projects = getProjectIds();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Switch Project</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose the project you want to work with.</p>
      </div>
      <ProjectSelector projects={projects} selectedProject={selectedProject} />
    </div>
  );
}
