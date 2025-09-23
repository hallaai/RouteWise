
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { Task } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

// Leaflet and plugins
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

// Import marker images from node_modules. This is the crucial part.
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

interface MapViewProps {
  tasks: Task[];
  scheduledTaskIds: Set<string>;
  activeTaskGroups: Set<string>;
}

type FilterType = "all" | "scheduled" | "unscheduled";

// This is the definitive fix. We must set up the icon paths *before* the component renders.
// This runs once when the module is loaded on the client.
if (typeof window !== 'undefined') {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: iconRetinaUrl.src,
        iconUrl: iconUrl.src,
        shadowUrl: shadowUrl.src,
    });
}


export function MapView({ tasks, scheduledTaskIds, activeTaskGroups }: MapViewProps) {
  const [filter, setFilter] = React.useState<FilterType>("all");
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<L.MarkerClusterGroup | null>(null);

  const filteredTasks = React.useMemo(() => {
    switch (filter) {
      case "scheduled":
        return tasks.filter(task => {
            const baseId = task.id.split('-202')[0].replace('-adhoc','');
            return scheduledTaskIds.has(baseId) || scheduledTaskIds.has(task.id);
        });
      case "unscheduled":
        return tasks.filter(task => {
             const baseId = task.id.split('-202')[0].replace('-adhoc','');
            return !scheduledTaskIds.has(baseId) && !scheduledTaskIds.has(task.id) && scheduledTaskIds.size > 0
        });
      case "all":
      default:
        return tasks;
    }
  }, [tasks, scheduledTaskIds, filter]);
  
  React.useEffect(() => {
    // Initialize map only once when the component mounts
    if (mapContainerRef.current && !mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current).setView([61.498, 23.76], 10); // Default view
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);
        
        // Initialize marker cluster group once
        markersRef.current = L.markerClusterGroup();
        mapRef.current.addLayer(markersRef.current);
    }
  }, []); // Empty dependency array ensures this runs only once on mount


  React.useEffect(() => {
    // This effect handles adding/updating markers when filteredTasks change.
    if (mapRef.current && markersRef.current) {
        const markerLayer = markersRef.current;
        markerLayer.clearLayers();

        const validTasks = filteredTasks.filter(task => 
            task.location && 
            typeof task.location.lat === 'number' && 
            typeof task.location.lng === 'number'
        );

        if (validTasks.length > 0) {
            const bounds = L.latLngBounds(validTasks.map(task => [task.location.lat, task.location.lng]));
            
            validTasks.forEach(task => {
                const originalId = task.originalId || task.id;
                const isHighlighted = activeTaskGroups.has(originalId);
                
                const customIcon = new L.Icon({
                    iconUrl: iconUrl.src,
                    iconRetinaUrl: iconRetinaUrl.src,
                    shadowUrl: shadowUrl.src,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                    className: isHighlighted ? 'leaflet-marker-highlighted' : ''
                });

                const marker = L.marker([task.location.lat, task.location.lng], { icon: customIcon });
                
                const popupContent = `
                  <div style="font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6;">
                    <b style="font-size: 16px; font-weight: 600;">${task.name}</b><br>
                    <strong>Type:</strong> <span style="text-transform: capitalize;">${task.type}</span><br>
                    <strong>Duration:</strong> ${task.duration} min<br>
                    <strong>Address:</strong> ${task.location.address}<br>
                    ${task.segment ? `<strong>Segment:</strong> ${task.segment}<br>` : ''}
                  </div>
                `;
                marker.bindPopup(popupContent);
                markerLayer.addLayer(marker);
            });

            if (mapRef.current && bounds.isValid()) {
                mapRef.current.fitBounds(bounds.pad(0.1));
            }
        }
    }
  }, [filteredTasks, activeTaskGroups]);


  return (
    <Card>
      <style>
        {`
          .leaflet-marker-highlighted {
            filter: hue-rotate(170deg) brightness(1.2) saturate(2);
          }
        `}
      </style>
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
              <RadioGroupItem value="unscheduled" id="unscheduled" disabled={scheduledTaskIds.size === 0}/>
              <Label htmlFor="unscheduled" className={cn(scheduledTaskIds.size === 0 && "text-muted-foreground")}>Unscheduled</Label>
            </div>
          </RadioGroup>
      </CardHeader>
      <CardContent>
        <div ref={mapContainerRef} className="w-full h-[60vh] bg-secondary rounded-lg" />
      </CardContent>
    </Card>
  );
}

