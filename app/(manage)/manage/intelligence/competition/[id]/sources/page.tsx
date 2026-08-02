import React from 'react'

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Competition Sources</h1>
      <p>Competition ID: {params.id}</p>
      <p>Route: /manage/intelligence/competition/{params.id}/sources</p>
    </div>
  )
}
