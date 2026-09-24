'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function ProjectSelector({ projects, selectedProject }: { projects: string[]; selectedProject: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(project: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('project', project);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">Project</span>
      <select value={selectedProject ?? ''} onChange={(event) => handleChange(event.target.value)} disabled={projects.length === 0} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="" disabled>{projects.length > 0 ? 'Select a project' : 'No projects configured'}</option>
        {projects.map((project) => <option key={project} value={project}>{project}</option>)}
      </select>
    </label>
  );
}
