import React from 'react'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1>Competition Sources</h1>
      <p>Competition ID: {id}</p>
      <p>Route: /manage/intelligence/competition/{id}/sources</p>
    </div>
  )
}
