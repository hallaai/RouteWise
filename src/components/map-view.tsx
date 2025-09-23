
"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds, divIcon } from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Task } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { renderToStaticMarkup } from "react-dom/server";
import { Circle } from "lucide-react";

interface MapViewProps {
  tasks: Task[];
  scheduledTaskIds: Set<string>;
  activeTaskGroups: Set<string>;
}

type FilterType = "all" | "scheduled" | "unscheduled";

// Custom hook to update map view when tasks change
const MapUpdater = ({ tasks }: { tasks: Task[] }) => {
  const map = useMap();
  React.useEffect(() => {
    if (tasks.length > 0) {
      const bounds = new LatLngBounds(tasks.map(task => [task.location.lat, task.location.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [tasks, map]);
  return null;
};


export function MapView({ tasks, scheduledTaskIds, activeTaskGroups }: MapViewProps) {
  const [filter, setFilter] = React.useState<FilterType>("all");
  
  // Handle client-side only rendering
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredTasks = React.useMemo(() => {
    switch (filter) {
      case "scheduled":
        return tasks.filter(task => {
          // A task is considered scheduled if any of its occurrences are in the schedule
          return scheduledTaskIds.has(task.id);
        });
      case "unscheduled":
        return tasks.filter(task => !scheduledTaskIds.has(task.id));
      case "all":
      default:
        return tasks;
    }
  }, [tasks, scheduledTaskIds, filter]);
  
  const createMarkerIcon = (isHighlighted: boolean) => {
    const iconMarkup = renderToStaticMarkup(
       <Circle 
          className={isHighlighted ? 'text-accent' : 'text-primary'}
          fill={isHighlighted ? 'hsl(var(--accent))' : 'hsl(var(--primary))'}
          strokeWidth={1}
          stroke="white"
          size={isHighlighted ? 18 : 12}
       />
    );
    return divIcon({
      html: iconMarkup,
      className: 'bg-transparent border-0',
      iconSize: [isHighlighted ? 18 : 12, isHighlighted ? 18 : 12],
      iconAnchor: [isHighlighted ? 9 : 6, isHighlighted ? 9 : 6],
    });
  }

  if (!isClient) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>Route Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[60vh] bg-secondary rounded-lg flex items-center justify-center">
            <p>Loading Map...</p>
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
           <MapContainer center={[61.498, 23.76]} zoom={10} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredTasks.map(task => {
                const isHighlighted = activeTaskGroups.has(task.id);
                return (
                  <Marker 
                    key={task.id} 
                    position={[task.location.lat, task.location.lng]}
                    icon={createMarkerIcon(isHighlighted)}
                  >
                    <Popup>
                      <b>{task.name}</b><br />{task.location.address}
                    </Popup>
                  </Marker>
                )
            })}
             <MapUpdater tasks={filteredTasks} />
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
