'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function ProjectSelector({ projects, selectedProject }: { projects: string[]; selectedProject: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedValue, setSelectedValue] = useState(selectedProject ?? '');

  function handleChange(project: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('project', project);
    const nextUrl = `${pathname}?${nextParams.toString()}`;
    setSelectedValue(project);
    window.history.replaceState(window.history.state, '', nextUrl);
  }

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">Project</span>
      <select
        value={selectedValue}
        onChange={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleChange(event.target.value);
        }}
        onClick={(event) => event.stopPropagation()}
        disabled={projects.length === 0}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="" disabled>{projects.length > 0 ? 'Select a project' : 'No projects configured'}</option>
        {projects.map((project) => <option key={project} value={project}>{project}</option>)}
      </select>
    </label>
  );
}
