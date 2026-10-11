# SIDEQUEST 🛫🚂🚍

**SIDEQUEST** is an ephemeral, real-time social platform built for travelers. Whether you're on a 12-hour flight or a cross-country train ride, SIDEQUEST connects you with fellow passengers on the exact same journey. 

Check in to your specific transit service, enter the virtual Lounge, and break the ice through ephemeral chats, Tic-Tac-Toe games, and real-time audio/video calls. Once the journey ends, the Lounge disappears—but the connections you made stay with you.

---

## 🌟 Key Features

* **Real-time Ephemeral Lounges:** Join a digital lounge strictly scoped to your specific mode of transit, operator, service number, and date.
* **Privacy-First Discovery:** Control your visibility. Choose between *Quiet* (invisible), *Chat*, or *Game* modes to broadcast your interaction preferences to fellow passengers.
* **Window Seat XO (Tic-Tac-Toe):** Send game invites and play real-time Tic-Tac-Toe with other passengers. Earn points for wins and draws!
* **Unified Notification Board:** Elegant, animated inbox inside the Lounge to manage incoming connection and game requests.
* **Friends Dashboard:** A persistent space to see all the connections you've made across your past journeys. You can even launch an XO game directly from here!
* **Travelogue (Photo Gallery):** Snap and share photos from your trip. Photos are automatically stamped with your journey details and displayed in a beautiful grid.
* **LiveKit Audio/Video Signaling:** Built-in signaling foundations for high-quality WebRTC audio and video calls.

---

## 🛠️ Tech Stack

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
* **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, RPCs, Storage, Realtime)
* **WebRTC / Calls:** [LiveKit](https://livekit.io/)
* **Icons:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js (v18+)
* A Supabase account and project
* A LiveKit Cloud account (optional, for A/V calls)

### 2. Environment Setup
Clone the repository and install dependencies:
```bash
npm install
```

Create a `.env` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LiveKit configuration (Optional)
LIVEKIT_URL=your-livekit-url
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Application origin
APP_ORIGIN=http://localhost:3000
```

### 3. Database Setup (Supabase)
SIDEQUEST relies heavily on Postgres RPCs (Remote Procedure Calls) and strict Row-Level Security (RLS) to ensure users can only interact with passengers on their specific journey.

1. Go to your Supabase Dashboard -> **SQL Editor**.
2. Execute the migration files located in `supabase/migrations/` in chronological order.
   * `20261010000100_core.sql` - Base schemas
   * `20261010000200_access.sql` - RLS Policies
   * ... *(Run all subsequent files up to `20261010001002_fix_join.sql`)*

### 4. Storage Setup (Travelogue)
To enable the photo uploading feature:
1. Go to Supabase Dashboard -> **Storage**.
2. Create a new bucket named **`travelogue`** (all lowercase).
3. Ensure you check **Public Bucket**.
4. Run the following RLS policy in your SQL Editor to allow authenticated uploads:
```sql
grant insert, update, delete on public.drops to authenticated;

create policy "Users can insert their own drops"
on storage.objects for insert to authenticated with check ( bucket_id = 'travelogue' );

create policy "Allow public viewing"
on storage.objects for select to public using ( bucket_id = 'travelogue' );
```

### 5. Run the Application
Start the Next.js Turbopack development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎨 Theme Configuration
SIDEQUEST uses a warm, vibrant sunset theme designed to feel energetic and welcoming. The color variables can be customized directly in `src/app/globals.css`.

## 🔒 Architecture Notes
* **Secure by Default:** `authenticated` users are stripped of direct `INSERT`/`UPDATE` permissions on most public tables. All interactions (joining journeys, sending messages, requesting games) are mediated through strict `SECURITY DEFINER` Postgres functions.
* **Journey Expiration:** Journeys naturally expire. The `join_journey` RPC automatically cleans up ghost sessions if a user attempts to join a new journey after their previous one has ended.

---
*Safe travels and happy sidequesting!* 🌍
