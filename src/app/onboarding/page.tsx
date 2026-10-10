'use client'

import * as React from 'react'
import { saveProfile } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function OnboardingPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    const result = await saveProfile(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-md p-8 bg-panel rounded-3xl shadow-xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">Create Your Profile</h1>
        <p className="text-foreground/70 mb-8">
          Welcome to SIDEQUEST! Pick an alias and avatar seed. You can stay completely anonymous.
        </p>

        <form action={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="display_name">
              Display Name (Alias)
            </label>
            <Input
              id="display_name"
              name="display_name"
              type="text"
              required
              minLength={2}
              maxLength={30}
              placeholder="e.g. Mystery Traveler"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="avatar_seed">
              Avatar Seed
            </label>
            <Input
              id="avatar_seed"
              name="avatar_seed"
              type="text"
              required
              defaultValue="lime"
              placeholder="Any word to generate your avatar"
            />
            <p className="text-xs text-foreground/50 mt-1">This generates your abstract avatar pattern.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="bio">
              Bio (Optional)
            </label>
            <Input
              id="bio"
              name="bio"
              type="text"
              maxLength={160}
              placeholder="A short intro..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="interests">
              Interests (Optional)
            </label>
            <Input
              id="interests"
              name="interests"
              type="text"
              placeholder="Coffee, Reading, Tech (comma separated)"
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-background/50 rounded-xl">
            <input
              id="is_adult"
              name="is_adult"
              type="checkbox"
              required
              className="mt-1 w-5 h-5 rounded border-foreground/20 text-primary focus:ring-accent bg-panel"
            />
            <label className="text-sm text-foreground/80 leading-relaxed" htmlFor="is_adult">
              I attest that I am at least 18 years old. I understand this is a temporary, unmoderated social space and I am responsible for my own safety and boundaries.
            </label>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full mt-4" 
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Complete Profile'}
          </Button>
        </form>
      </div>
    </div>
  )
}
