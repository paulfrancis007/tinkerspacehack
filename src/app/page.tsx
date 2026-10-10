"use client";

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { TicketCard } from '@/components/ui/TicketCard';
import { Plane, TrainFront, Bus, Compass, Search, User, MessageSquare } from 'lucide-react';

export default function LandingPage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Basic loading skeleton to prevent hydration mismatch for motion elements
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="p-6 md:px-12 md:py-8 flex justify-between items-center z-10 relative">
        <div className="font-bold text-2xl tracking-widest text-primary">SIDEQUEST</div>
        <Link href="/login" tabIndex={-1}>
          <Button variant="ghost" className="font-semibold text-accent">Login</Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 md:p-12 gap-12 lg:gap-24 overflow-hidden relative z-10">
        
        {/* Left Side: Copy & CTA */}
        <div className="flex flex-col gap-6 w-full max-w-xl z-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground"
          >
            Your journey. <br/>
            <span className="text-primary">Your people.</span> <br/>
            Your side quests.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-foreground/80 leading-relaxed max-w-md"
          >
            A temporary, consent-based social lounge for passengers sharing the same route. No real names, no exact seats.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 flex flex-wrap gap-4"
          >
            <Link href="/login" tabIndex={-1}>
              <Button variant="primary" className="text-lg px-8">
                Find my journey
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Right Side: Abstract Ticket & Constellation Art */}
        <div className="w-full max-w-md relative z-20">
          {/* Illustrative Constellation Background */}
          <div className="absolute inset-0 -m-16 opacity-30 pointer-events-none" aria-hidden="true">
            <svg viewBox="0 0 400 400" className="w-full h-full text-accent">
              <path d="M 50 150 Q 150 50, 250 150 T 350 150" fill="transparent" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="motion-safe:animate-pulse" />
              <circle cx="50" cy="150" r="4" fill="currentColor" />
              <circle cx="150" cy="100" r="6" fill="currentColor" />
              <circle cx="250" cy="150" r="4" fill="currentColor" />
              <circle cx="300" cy="220" r="5" fill="currentColor" />
              <circle cx="350" cy="150" r="3" fill="currentColor" />
              <line x1="150" y1="100" x2="300" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="250" y1="150" x2="300" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </svg>
            <p className="absolute bottom-4 right-4 text-xs text-accent/80 font-mono">* Illustrative art, not live users</p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <TicketCard className="transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-sm font-bold opacity-50 tracking-wider">JOURNEY PASS</div>
                  <div className="text-2xl font-black mt-1">SQ-808</div>
                </div>
                <div className="flex gap-2 text-background/50">
                  <Plane size={24} />
                  <TrainFront size={24} />
                  <Bus size={24} />
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-background/20 pb-4">
                  <div>
                    <div className="text-xs opacity-60 uppercase">Origin</div>
                    <div className="font-bold text-xl">LHR</div>
                  </div>
                  <div className="flex-1 px-4 flex items-center justify-center">
                    <div className="h-px w-full bg-background/30 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-background" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-60 uppercase">Dest</div>
                    <div className="font-bold text-xl">JFK</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs opacity-60 uppercase mb-1">Status</div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background text-foreground text-sm font-bold">
                      <Compass size={16} className="text-primary" />
                      Lounge Open
                    </div>
                  </div>
                </div>
              </div>
            </TicketCard>
          </motion.div>
        </div>
      </main>

      {/* How it works strip */}
      <footer className="w-full bg-panel p-6 md:p-8 mt-auto z-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl text-primary">
              <Search size={24} />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Find your route</h3>
              <p className="text-sm text-foreground/70">Enter your travel details to find or create your temporary lounge.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-accent/10 p-3 rounded-xl text-accent">
              <User size={24} />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Stay anonymous</h3>
              <p className="text-sm text-foreground/70">Pick an alias and avatar. No real names or exact seats required.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl text-primary">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Connect on your terms</h3>
              <p className="text-sm text-foreground/70">Accept or ignore requests. Chat, play games, or stay quiet.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
