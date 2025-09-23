
"use client";

import { useState } from 'react';
import { Dashboard } from "@/components/dashboard";
import type { AppState } from '@/lib/types';

export default function Home() {
  const [appState, setAppState] = useState<AppState>({
    workingDayHours: 1,
    vehicleSpeed: 70,
    includeHomeTravel: {
      start: true,
      end: true,
    }
  });

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Dashboard appState={appState} setAppState={setAppState} />
    </div>
  );
}
