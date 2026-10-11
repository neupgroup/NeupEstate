import React from 'react'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1>Competitor Alerts</h1>
      <p>Competitor ID: {id}</p>
      <p>Route: /manage/intelligence/competitor/{id}/alerts</p>
    </div>
  )
}
