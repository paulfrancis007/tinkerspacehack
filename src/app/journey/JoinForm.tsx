'use client'

import * as React from 'react'
import { joinJourney } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function JoinForm() {
  const [today, setToday] = React.useState('')
  React.useEffect(() => { setToday(new Date().toISOString().split('T')[0]) }, [])
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    const result = await joinJourney(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-panel p-8 rounded-3xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Mode</label>
          <select name="mode" className="flex min-h-[48px] w-full rounded-2xl bg-background px-4 text-foreground border border-foreground/10 focus:ring-2 focus:ring-accent outline-none">
            <option value="flight">Flight</option>
            <option value="train">Train</option>
            <option value="bus">Bus</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Date (Local)</label>
          <Input type="date" name="service_date" required defaultValue={today} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Operator Code</label>
          <Input name="operator_code" placeholder="e.g. BA" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Service Number</label>
          <Input name="service_number" placeholder="e.g. 117" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Origin Code</label>
          <Input name="origin_code" placeholder="LHR" required maxLength={10} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Dest Code</label>
          <Input name="destination_code" placeholder="JFK" required maxLength={10} />
        </div>
      </div>

      <p className="text-xs text-foreground/50 text-center">
        Journeys are matched exactly on Mode, Date, Operator, Number, Origin, and Destination.
      </p>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Joining...' : 'Enter Lounge'}
      </Button>
    </form>
  )
}

