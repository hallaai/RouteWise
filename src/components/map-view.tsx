
"use client";

import { Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function MapView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Route Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[60vh] bg-secondary rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Map className="mx-auto h-12 w-12 mb-4" />
            <p className="font-semibold">Map View Unavailable</p>
            <p className="text-sm">
              Route visualization will be displayed here once an API key is configured.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
