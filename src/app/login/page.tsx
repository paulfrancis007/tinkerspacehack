'use client'

import * as React from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect_to') || '/dashboard'
  
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsPending(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-8 bg-panel rounded-3xl shadow-xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
        <p className="text-foreground/70 mb-8">
          Public signup is currently disabled for this closed demo. Please sign in with your invite-only test account. Verified signup flows are unavailable unless SMTP is configured.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect_to" value={redirectTo} />
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="A@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
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
            {isPending ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </React.Suspense>
  )
}

