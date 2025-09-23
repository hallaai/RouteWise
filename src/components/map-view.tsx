
"use client";

import * as React from "react";
import { Wrapper } from "@googlemaps/react-wrapper";
import { Map as MapIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Task } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

// You need to add your Google Maps API key here for the map to work.
const API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

interface MapViewProps {
  tasks: Task[];
  scheduledTaskIds: Set<string>;
  activeTaskGroups: Set<string>;
}

type FilterType = "all" | "scheduled" | "unscheduled";

export function MapView({ tasks, scheduledTaskIds, activeTaskGroups }: MapViewProps) {
  const [filter, setFilter] = React.useState<FilterType>("all");

  const filteredTasks = React.useMemo(() => {
    switch (filter) {
      case "scheduled":
        return tasks.filter(task => scheduledTaskIds.has(task.id));
      case "unscheduled":
        return tasks.filter(task => !scheduledTaskids.has(task.id));
      case "all":
      default:
        return tasks;
    }
  }, [tasks, scheduledTaskIds, filter]);
  

  const render = (status: any) => {
    switch (status) {
      case "LOADING":
        return <p>Loading...</p>;
      case "FAILURE":
        return <p>Error loading map.</p>;
      case "SUCCESS":
        return <GoogleMap tasks={filteredTasks} activeTaskGroups={activeTaskGroups} />;
    }
  };

  if (API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Route Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[60vh] bg-secondary rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapIcon className="mx-auto h-12 w-12 mb-4" />
              <p className="font-semibold">Map View Unavailable</p>
              <p className="text-sm">
                Please add your Google Maps API key in `src/components/map-view.tsx` to enable this view.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Route Map</CardTitle>
         <RadioGroup value={filter} onValueChange={(value: FilterType) => setFilter(value)} className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all">All</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scheduled" id="scheduled" />
              <Label htmlFor="scheduled">Scheduled</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unscheduled" id="unscheduled" />
              <Label htmlFor="unscheduled">Unscheduled</Label>
            </div>
          </RadioGroup>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[60vh] bg-secondary rounded-lg">
          <Wrapper apiKey={API_KEY} render={render} />
        </div>
      </CardContent>
    </Card>
  );
}


function GoogleMap({ tasks, activeTaskGroups }: { tasks: Task[], activeTaskGroups: Set<string> }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<google.maps.Map>();
  const markersRef = React.useRef<google.maps.Marker[]>([]);

  React.useEffect(() => {
    if (ref.current && !map) {
      setMap(new window.google.maps.Map(ref.current, {
        center: { lat: 61.498, lng: 23.76 }, // Default center to Tampere
        zoom: 10,
      }));
    }
  }, [ref, map]);

  React.useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (map && tasks.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      tasks.forEach(task => {
        const position = { lat: task.location.lat, lng: task.location.lng };
        
        const isHighlighted = task.originalId ? activeTaskGroups.has(task.originalId) : activeTaskGroups.has(task.id);

        const marker = new google.maps.Marker({
          position,
          map,
          title: task.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isHighlighted ? 10 : 7,
            fillColor: isHighlighted ? '#FF9933' : '#29ABE2', // Accent for highlighted, primary for others
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#FFFFFF',
          }
        });

        const infowindow = new google.maps.InfoWindow({
          content: `<b>${task.name}</b><br>${task.location.address}`,
        });

        marker.addListener("click", () => {
          infowindow.open({
            anchor: marker,
            map,
            shouldFocus: false,
          });
        });

        markersRef.current.push(marker);
        bounds.extend(position);
      });
      map.fitBounds(bounds);
    }
  }, [map, tasks, activeTaskGroups]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
