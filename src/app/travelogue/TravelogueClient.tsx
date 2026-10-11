'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ImagePlus, Loader2 } from 'lucide-react'

export function TravelogueClient({ activeJourneys, currentUserId }: { activeJourneys: any[], currentUserId: string }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [caption, setCaption] = React.useState('')
  const [journeyId, setJourneyId] = React.useState(activeJourneys[0]?.id || '')
  const [isUploading, setIsUploading] = React.useState(false)
  const supabase = createClient()

  const handleUpload = async () => {
    if (!file || !journeyId) return
    setIsUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${currentUserId}_${Date.now()}.${ext}`
      
      // Upload to 'travelogue' bucket
      const { error: uploadError } = await supabase.storage
        .from('travelogue')
        .upload(fileName, file)

      if (uploadError) {
        alert("Upload failed. Have you created the 'travelogue' bucket in Supabase and enabled public access? Error: " + uploadError.message)
        setIsUploading(false)
        return
      }

      // Insert record in drops
      const { error: dbError } = await supabase.rpc('create_drop', {
        p_journey_id: journeyId,
        p_object_path: fileName,
        p_caption: caption
      })

      if (dbError) throw dbError

      alert("Photo uploaded to your travelogue!")
      setFile(null)
      setCaption('')
      // Refresh page to show new drop
      window.location.reload()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsUploading(false)
    }
  }

  if (activeJourneys.length === 0) {
    return <p className="text-foreground/70">You must be in an active journey to upload photos.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-background rounded-2xl p-4 border border-foreground/10 flex items-center justify-center border-dashed relative">
        <input 
          type="file" 
          accept="image/*" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isUploading}
        />
        {file ? (
          <p className="font-bold text-primary">{file.name}</p>
        ) : (
          <div className="flex flex-col items-center gap-2 text-foreground/50 pointer-events-none">
            <ImagePlus size={24} />
            <p className="text-sm font-medium">Tap to select photo</p>
          </div>
        )}
      </div>

      <Input 
        placeholder="Add a caption..." 
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        disabled={isUploading}
        maxLength={100}
      />

      <select 
        value={journeyId} 
        onChange={e => setJourneyId(e.target.value)}
        className="w-full bg-background border border-foreground/20 rounded-xl p-3 text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
        disabled={isUploading}
      >
        {activeJourneys.map(j => (
          <option key={j.id} value={j.id}>{j.operator_code} {j.service_number}</option>
        ))}
      </select>

      <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
        {isUploading ? <><Loader2 size={16} className="animate-spin mr-2" /> Uploading...</> : 'Post to Travelogue'}
      </Button>
    </div>
  )
}
