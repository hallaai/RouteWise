

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { Task, Target, GeneratedSchedule } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { cn, stringToColor } from "@/lib/utils";

// Leaflet and plugins
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

import { parseISO, format } from "date-fns";


interface MapViewProps {
  tasks: Task[];
  targets: Target[];
  schedule: GeneratedSchedule | null;
  scheduledTaskIds: Set<string>;
  activeTaskGroups: Set<string>;
}

type FilterType = "all" | "scheduled" | "unscheduled";

// SVG for the home icon
const homeIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
`;


export function MapView({ tasks, targets, schedule, scheduledTaskIds, activeTaskGroups }: MapViewProps) {
  const [filter, setFilter] = React.useState<FilterType>("all");
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const taskMarkersRef = React.useRef<L.MarkerClusterGroup | null>(null);
  const routeLayerRef = React.useRef<L.LayerGroup | null>(null);

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
    if (mapContainerRef.current && !mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          attributionControl: false
        }).setView([60.4518, 22.2666], 10);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);
        
        L.control.attribution({ position: 'bottomleft' }).addTo(mapRef.current);
        
        taskMarkersRef.current = L.markerClusterGroup();
        mapRef.current.addLayer(taskMarkersRef.current);

        routeLayerRef.current = L.layerGroup();
        mapRef.current.addLayer(routeLayerRef.current);
    }
  }, []);


  React.useEffect(() => {
    if (mapRef.current && taskMarkersRef.current && routeLayerRef.current) {
        const taskMarkerLayer = taskMarkersRef.current;
        const routeLayer = routeLayerRef.current;
        taskMarkerLayer.clearLayers();
        routeLayer.clearLayers();

        const bounds = L.latLngBounds([]);

        // --- Draw Task Markers ---
        const validTasks = filteredTasks.filter(task => 
            task.location && 
            typeof task.location.lat === 'number' && 
            typeof task.location.lng === 'number'
        );

        validTasks.forEach(task => {
            const originalId = task.originalId || task.id;
            const isHighlighted = activeTaskGroups.has(originalId);
            
            const circleMarker = L.circleMarker([task.location.lat, task.location.lng], {
                radius: 8,
                fillColor: isHighlighted ? "#ff9933" : "#29abe2",
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            const popupContent = `
              <div style="font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6;">
                <b style="font-size: 16px; font-weight: 600;">${task.name}</b><br>
                <strong>Type:</strong> <span style="text-transform: capitalize;">${task.type}</span><br>
                <strong>Duration:</strong> ${task.duration} min<br>
                <strong>Address:</strong> ${task.location.address}<br>
                ${task.segment ? `<strong>Segment:</strong> ${task.segment}<br>` : ''}
              </div>
            `;
            circleMarker.bindPopup(popupContent);
            taskMarkerLayer.addLayer(circleMarker);
            bounds.extend(circleMarker.getLatLng());
        });

        // --- Draw Routes and Home Icons ---
        if (schedule) {
          const scheduledTargets = new Set<string>();
          Object.values(schedule).flat().forEach(ts => scheduledTargets.add(ts.targetId));

          targets.forEach(target => {
            if (!scheduledTargets.has(target.id)) return;

            const homeLatLng = L.latLng(target.home_location.lat, target.home_location.lng);

            // Add home icon
            const homeIcon = L.divIcon({
              html: homeIconSvg,
              className: 'home-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 24]
            });

            const homeMarker = L.marker(homeLatLng, { icon: homeIcon })
              .bindPopup(`<b>${target.name}'s Home</b>`);
            routeLayer.addLayer(homeMarker);
            bounds.extend(homeLatLng);

            const routePoints: L.LatLng[] = [homeLatLng];
            
            // This assumes we are viewing one day at a time, or routes for the first scheduled day in the range.
            // For multi-day view, this logic would need to be more complex.
            const firstDateWithSchedule = Object.keys(schedule).find(date => schedule[date].some(ts => ts.targetId === target.id && ts.schedule.length > 0));

            if (firstDateWithSchedule) {
              const targetSchedule = schedule[firstDateWithSchedule].find(ts => ts.targetId === target.id);
              if (targetSchedule) {
                 targetSchedule.schedule.forEach(entry => {
                   const task = tasks.find(t => t.id === entry.taskId);
                   if (task) {
                     routePoints.push(L.latLng(task.location.lat, task.location.lng));
                   }
                 });
              }
            }

            if(routePoints.length > 1) {
              routePoints.push(homeLatLng); // Add return to home
              const routePolyline = L.polyline(routePoints, {
                color: stringToColor(target.id),
                weight: 3,
                opacity: 0.7
              });
              routeLayer.addLayer(routePolyline);
            }
          });
        }

        if (mapRef.current && bounds.isValid()) {
            mapRef.current.fitBounds(bounds.pad(0.1));
        }
    }
  }, [filteredTasks, activeTaskGroups, schedule, targets]);


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

