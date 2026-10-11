import { createClient } from '@/lib/supabase/server'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Camera, Image as ImageIcon, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TravelogueClient } from './TravelogueClient'


export const instant = false

export default async function TraveloguePage() {
  await connection()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch recent drops for this user
  const { data: drops } = await supabase
    .from('drops')
    .select('*, journeys(operator_code, service_number)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch active journeys to upload TO
  const { data: activeJourneys } = await supabase
    .from('journeys')
    .select('id, operator_code, service_number, memberships!inner(user_id, left_at)')
    .eq('memberships.user_id', user.id)
    .is('memberships.left_at', null)

  console.log('PUBLIC URL FOR DROP:', drops?.[0]?.object_path ? supabase.storage.from('travelogue').getPublicUrl(drops[0].object_path).data.publicUrl : 'no drop');
  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/20 text-primary rounded-2xl">
          <Camera size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Travelogue</h1>
          <p className="text-foreground/70">Capture and share memories from your journeys.</p>
        </div>
      </div>

      <div className="bg-panel rounded-3xl p-6 border-2 border-primary/20 shadow-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload size={20} className="text-primary" />
          New Capture
        </h2>
        <TravelogueClient activeJourneys={activeJourneys || []} currentUserId={user.id} />
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-bold mb-6">Your Gallery</h2>
        {!drops || drops.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-background rounded-3xl border border-foreground/10 text-center">
            <ImageIcon size={48} className="text-foreground/20 mb-4" />
            <p className="text-foreground/60">You haven't uploaded any captures yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {drops.map((drop: any) => (
              <div key={drop.id}    className="bg-background rounded-2xl overflow-hidden border border-foreground/10 group">
                <div className="aspect-square bg-panel flex items-center justify-center relative">
                  {drop.object_path ? (
                    // We construct the public URL from the travelogue bucket
                    <img 
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/travelogue/${drop.object_path}`} 
                      alt={drop.caption}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon size={32} className="mx-auto text-foreground/20 mb-2" />
                      <span className="text-xs text-foreground/50">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold shadow">
                    {drop.journeys?.operator_code || 'Old'} {drop.journeys?.service_number || 'Journey'}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm">{drop.caption || 'No caption provided.'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


