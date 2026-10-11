import React from 'react'

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Competitor Alerts</h1>
      <p>Competitor ID: {params.id}</p>
      <p>Route: /manage/intelligence/competitor/{params.id}/alerts</p>
    </div>
  )
}
