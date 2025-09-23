
"use client";

import * as React from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Waypoints, Settings } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import type { AppState } from '@/lib/types';
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const router = useRouter();
  const [appState, setAppState] = React.useState<AppState | null>(null);

  React.useEffect(() => {
    const savedState = localStorage.getItem('appState');
    if (savedState) {
      setAppState(JSON.parse(savedState));
    } else {
      // Initialize with default if nothing is in local storage
      setAppState({
        workingDayHours: 1,
        vehicleSpeed: 70,
        includeHomeTravel: {
            start: true,
            end: true,
        },
        useTargetPhoto: false,
      });
    }
  }, []);

  const handleSave = () => {
    if (appState) {
      localStorage.setItem('appState', JSON.stringify(appState));
      router.push('/');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    if (appState) {
        setAppState(prevState => ({
            ...prevState!,
            [id]: type === 'number' ? Number(value) : value,
        }));
    }
  };

  const handleCheckboxChange = (id: 'start' | 'end', checked: boolean) => {
    if (appState) {
        setAppState(prevState => ({
            ...prevState!,
            includeHomeTravel: {
                ...prevState!.includeHomeTravel,
                [id]: checked
            }
        }));
    }
  };

  const handleSwitchChange = (id: 'useTargetPhoto', checked: boolean) => {
    if (appState) {
        setAppState(prevState => ({
            ...prevState!,
            [id]: checked,
        }));
    }
  };

  if (!appState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
         <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <Waypoints className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">RouteWise Scheduler</h1>
            </Link>
        </div>
        <div className="ml-auto flex items-center gap-2">
           <Button onClick={handleSave}>Save and Return</Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Settings />
                Scheduling and Display Options
                </CardTitle>
                <CardDescription>
                Adjust parameters for the scheduling algorithm and UI.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="workingDayHours">
                        Extend working day by (hours)
                        </Label>
                        <Input
                            id="workingDayHours"
                            type="number"
                            value={appState.workingDayHours}
                            onChange={handleInputChange}
                            className="max-w-[150px]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="vehicleSpeed">
                        Vehicle Speed (km/h)
                        </Label>
                        <Input
                        id="vehicleSpeed"
                        type="number"
                        value={appState.vehicleSpeed}
                        onChange={handleInputChange}
                        max={999}
                        className="max-w-[150px]"
                        />
                    </div>
                </div>
                 <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="start"
                        checked={appState.includeHomeTravel.start}
                        onCheckedChange={(checked) => handleCheckboxChange('start', !!checked)}
                      />
                      <Label
                        htmlFor="start"
                        className="flex items-center gap-2"
                      >
                        Include travel from home
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="end"
                        checked={appState.includeHomeTravel.end}
                        onCheckedChange={(checked) => handleCheckboxChange('end', !!checked)}
                      />
                      <Label
                        htmlFor="end"
                        className="flex items-center gap-2"
                      >
                        Include travel to home
                      </Label>
                    </div>
                  </div>
                  <Separator />
                   <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="useTargetPhoto"
                                checked={appState.useTargetPhoto}
                                onCheckedChange={(checked) => handleSwitchChange('useTargetPhoto', !!checked)}
                            />
                            <Label htmlFor="useTargetPhoto">
                                Use target photos in schedule view
                            </Label>
                        </div>
                    </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
