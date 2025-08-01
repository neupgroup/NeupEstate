
'use server';

import type { JobOpening } from '@/types';

const mockJobs: JobOpening[] = [
  { id: 'job-1', title: 'Senior Frontend Engineer', location: 'Remote', type: 'Full-time', department: 'Engineering' },
  { id: 'job-2', title: 'Product Manager, AI', location: 'New York, NY', type: 'Full-time', department: 'Product' },
  { id: 'job-3', title: 'UX/UI Designer', location: 'Remote', type: 'Contract', department: 'Design' },
  { id: 'job-4', title: 'Lead Real Estate Analyst', location: 'Austin, TX', type: 'Full-time', department: 'Data & Analytics' },
];

export async function getJobOpenings(): Promise<JobOpening[]> {
    // In a real application, this would fetch jobs from a database or a third-party service.
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(mockJobs);
        }, 500); // Simulate network delay
    });
}
