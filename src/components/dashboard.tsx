
"use client";

import * as React from "react";
import {
  ArrowUpDown,
  Calendar as CalendarIcon,
  ChevronDown,
  Home,
  ListTodo,
  Map,
  Package,
  Settings,
  SlidersHorizontal,
  Truck,
  Users,
  Waypoints,
  Wrench,
  Upload,
  Clock,
} from "lucide-react";
import { format, addMinutes, startOfDay, addDays, eachDayOfInterval, parseISO, setHours, setMinutes, setSeconds, parse, differenceInMinutes, isBefore, isWithinInterval, add } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Task, Target, GeneratedSchedule, TaskType, ScheduleEntry, TargetSchedule } from "@/lib/types";
import { MapView } from "./map-view";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";

type SortConfig = {
  key: keyof Task;
  direction: "ascending" | "descending";
} | null;

const taskTypeIcons: Record<TaskType, JSX.Element> = {
  pickup: <Package className="h-4 w-4" />,
  delivery: <Truck className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  installation: <Settings className="h-4 w-4" />,
  cleaning: <Wrench className="h-4 w-4" />, // Example, choose a better icon if available
};

// Function to generate a color from a string
const stringToColor = (str: string) => {
  let hash = 0;
  if (!str) return '#29ABE2';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

const getTaskType = (work: any): TaskType => {
  if (work.segment?.toLowerCase().includes('siivous')) {
    return 'cleaning';
  }
  if (work.type?.toLowerCase() === 'maintenance') {
    return 'maintenance';
  }
  // Add more specific rules if needed
  return 'maintenance'; // Default fallback
};

// Haversine formula to calculate distance between two lat/lng points
const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

export function Dashboard() {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [targets, setTargets] = React.useState<Target[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(
    new Set()
  );
  const [selectedTargetIds, setSelectedTargetIds] = React.useState<
    Set<string>
  >(new Set());
  const [workingDayHours, setWorkingDayHours] = React.useState([8]);
  const [vehicleSpeed, setVehicleSpeed] = React.useState(70);
  const [includeHomeTravel, setIncludeHomeTravel] = React.useState({
    start: true,
    end: true,
  });
  const [filter, setFilter] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedSchedule, setGeneratedSchedule] =
    React.useState<GeneratedSchedule | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: addDays(startOfDay(new Date()), 6),
  });
  const [showExtendDayDialog, setShowExtendDayDialog] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          if (data.works && data.targets) {
            const newTasks: Task[] = data.works.map((work: any, index: number) => ({
              id: work.referenceId || `task-${index}`,
              name: work.name,
              location: {
                address: `${work.address.street}, ${work.address.city}`,
                lat: work.coordinates.lat,
                lng: work.coordinates.lon,
              },
              duration: work.load || 60, // Default duration if not provided
              type: getTaskType(work),
              priority: 'medium', // Default priority
              segment: work.segment,
              startTime: work.startTime ? parseISO(work.startTime) : undefined,
              endTime: work.endTime ? parseISO(work.endTime) : undefined,
              repeatInterval: work.repeatInterval,
            }));

            const newTargets: Target[] = data.targets.map((target: any, index: number) => ({
              id: target.referenceId || `target-${index}`,
              name: target.name,
              skills: target.skills.map((skill: any) => skill.name),
              home_location: {
                lat: target.coordinates.lat,
                lng: target.coordinates.lon,
              },
              avatarUrl: `https://picsum.photos/seed/${index+1}/200/200`, // Placeholder avatar
              schedules: target.schedules,
            }));
            
            setTasks(newTasks);
            setTargets(newTargets);
            setSelectedTaskIds(new Set(newTasks.map(t => t.id)));
            setSelectedTargetIds(new Set(newTargets.map(t => t.id)));

            toast({
              title: "Data Loaded",
              description: "Tasks and targets have been updated from the JSON file.",
            });
          } else {
            throw new Error("Invalid JSON format. 'works' and 'targets' arrays are required.");
          }

        } catch (error) {
          toast({
            title: "Error loading file",
            description: (error as Error).message || "Could not parse JSON file.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSelectAllTasks = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)));
    } else {
      setSelectedTaskIds(new Set());
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSet = new Set(selectedTaskIds);
    if (checked) {
      newSet.add(taskId);
    } else {
      newSet.delete(taskId);
    }
    setSelectedTaskIds(newSet);
  };

  const handleSelectTarget = (targetId: string, checked: boolean) => {
    const newSet = new Set(selectedTargetIds);
    if (checked) {
      newSet.add(targetId);
    } else {
      newSet.delete(targetId);
    }
    setSelectedTargetIds(newSet);
  };

  const sortedTasks = React.useMemo(() => {
    let sortableItems = [...tasks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [tasks, sortConfig]);

  const requestSort = (key: keyof Task) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const filteredTasks = sortedTasks.filter(
    (task) =>
      task.name.toLowerCase().includes(filter.toLowerCase()) ||
      task.location.address.toLowerCase().includes(filter.toLowerCase()) ||
      task.type.toLowerCase().includes(filter.toLowerCase())
  );
  
  const doesScheduleFit = (schedule: GeneratedSchedule) => {
    const workingDayMinutes = workingDayHours[0] * 60;
    for (const date in schedule) {
      for (const targetSchedule of schedule[date]) {
        if (targetSchedule.totalDuration + targetSchedule.totalTravelTime > workingDayMinutes) {
          return false;
        }
      }
    }
    return true;
  }

  const handleGenerateSchedule = (extendDay = false) => {
    if (selectedTaskIds.size === 0 || selectedTargetIds.size === 0) {
      toast({
        title: "Selection required",
        description: "Please select at least one task and one target.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    toast({
      title: "Generating Schedule...",
      description:
        "The AI is optimizing tasks and routes. This may take a moment.",
    });

    // A bit of a hack to get around the async nature of setState
    setTimeout(() => {
        const schedule: GeneratedSchedule = {};
        
        const originalTasksToSchedule = Array.from(selectedTaskIds)
          .map(id => tasks.find(t => t.id === id))
          .filter((t): t is Task => !!t);

        const targetsForScheduling = Array.from(selectedTargetIds)
            .map(id => targets.find(t => t.id === id))
            .filter((t): t is Target => !!t);

        const today = dateRange?.from || startOfDay(new Date());
        const endDay = dateRange?.to || addDays(today, 6);
        const datesToSchedule = eachDayOfInterval({ start: today, end: endDay });
        
        // Expand recurring tasks
        const allTaskOccurrences: (Task & { occurrenceDate: Date, originalId: string })[] = [];
        
        originalTasksToSchedule.forEach(task => {
          if (task.startTime) {
              if (task.repeatInterval && task.repeatInterval > 0) {
                  let currentDate = task.startTime;
                  // Generate occurrences until we are past the schedule's end date
                  while (currentDate <= endDay) {
                      if (isWithinInterval(currentDate, { start: today, end: endDay })) {
                          allTaskOccurrences.push({ 
                              ...task, 
                              originalId: task.id, 
                              id: `${task.id}-${format(currentDate, 'yyyy-MM-dd')}`, 
                              occurrenceDate: currentDate 
                          });
                      }
                      currentDate = addDays(currentDate, task.repeatInterval);
                  }
              } else {
                  // It's a non-recurring task, just check if it's in the date range
                  if (isWithinInterval(task.startTime, { start: today, end: endDay })) {
                      allTaskOccurrences.push({ 
                          ...task, 
                          originalId: task.id, 
                          id: `${task.id}-${format(task.startTime, 'yyyy-MM-dd')}`, 
                          occurrenceDate: task.startTime 
                      });
                  }
              }
          } else {
              // For tasks without a start time, let's assume they can be scheduled on any day within the range.
              // We'll create one occurrence for each day in the selected range.
              datesToSchedule.forEach(day => {
                  allTaskOccurrences.push({ 
                      ...task, 
                      originalId: task.id, 
                      id: `${task.id}-${format(day, 'yyyy-MM-dd')}`, 
                      occurrenceDate: day 
                  });
              });
          }
      });


        datesToSchedule.forEach(currentDate => {
            const dateStr = format(currentDate, "yyyy-MM-dd");
            schedule[dateStr] = [];

            const tasksForThisDay = allTaskOccurrences.filter(t => format(t.occurrenceDate, 'yyyy-MM-dd') === dateStr);
            const tasksToScheduleThisDay = new Set(tasksForThisDay.map(t => t.id));

            targetsForScheduling.forEach(target => {
                const targetScheduleInfo = target.schedules?.[0];
                if (!targetScheduleInfo) return;

                const [startHour, startMinute] = targetScheduleInfo.dayStarts.split(':').map(Number);
                let currentTime = setSeconds(setMinutes(setHours(currentDate, startHour), startMinute), 0);
                
                const [endHour, endMinute] = targetScheduleInfo.dayEnds.split(':').map(Number);
                const endOfDay = setSeconds(setMinutes(setHours(currentDate, endHour), endMinute), 0);

                const scheduledEntries: ScheduleEntry[] = [];
                let totalDuration = 0;
                let totalTravelTime = 0;
                let lastLocation = target.home_location;
                
                const route: TargetSchedule['route'] = [];


                const tempTasks = Array.from(tasksToScheduleThisDay);
                for (const taskId of tempTasks) {
                    const task = tasksForThisDay.find(t => t.id === taskId);
                    if (!task) continue;

                    const distance = getDistance(lastLocation.lat, lastLocation.lng, task.location.lat, task.location.lng);
                    const travelTime = Math.round((distance / vehicleSpeed) * 60); // in minutes

                    let arrivalTime = addMinutes(currentTime, travelTime);
                    let taskStartTime = arrivalTime;

                    if (task.startTime) {
                        const specificStartTime = setSeconds(setMinutes(setHours(currentDate, task.startTime.getHours()), task.startTime.getMinutes()), 0);
                        if (isBefore(taskStartTime, specificStartTime)) {
                          taskStartTime = specificStartTime;
                        }
                    }
                    
                    const taskEndTime = addMinutes(taskStartTime, task.duration);
                   
                    if (taskEndTime <= endOfDay) {
                        scheduledEntries.push({
                            taskId: taskId,
                            startTime: taskStartTime.toISOString(),
                            endTime: taskEndTime.toISOString(),
                            travelTimeFromPrevious: travelTime,
                        });
                        
                        totalDuration += task.duration;
                        totalTravelTime += travelTime;
                        currentTime = taskEndTime;
                        lastLocation = task.location;
                        tasksToScheduleThisDay.delete(taskId);
                    }
                }
                
                schedule[dateStr].push({
                    targetId: target.id,
                    schedule: scheduledEntries,
                    route: route,
                    totalDuration: totalDuration,
                    totalTravelTime: totalTravelTime
                });
            });
        });

      if (!extendDay && !doesScheduleFit(schedule)) {
        setShowExtendDayDialog(true);
        setIsLoading(false);
        return;
      }
      
      if (extendDay) {
        let maxRequiredHours = 0;
        for (const date in schedule) {
            for (const ts of schedule[date]) {
                const requiredMinutes = ts.totalDuration + ts.totalTravelTime;
                const requiredHours = Math.ceil(requiredMinutes / 60);
                if (requiredHours > maxRequiredHours) {
                    maxRequiredHours = requiredHours;
                }
            }
        }
        setWorkingDayHours([Math.min(12, maxRequiredHours)]);
      }

      setGeneratedSchedule(schedule);
      setIsLoading(false);
      setShowExtendDayDialog(false);
      toast({
        title: "Schedule Generated Successfully!",
        description: "View the new schedule in the 'Schedule' tab.",
      });
    }, 500);
  };
  
  const displayedDates = React.useMemo(() => {
    if (!dateRange?.from) return [];
    const to = dateRange.to || dateRange.from;
    return eachDayOfInterval({ start: dateRange.from, end: to });
  }, [dateRange]);
  
  const allTasksForSchedule = React.useMemo(() => {
     if (!generatedSchedule) return [];
     const allScheduledTasks: (Task & { occurrenceDate?: Date, originalId?: string })[] = [];
     Object.values(generatedSchedule).forEach(daySchedule => {
       daySchedule.forEach(ts => {
         ts.schedule.forEach(entry => {
           const originalTask = tasks.find(t => entry.taskId.startsWith(t.id));
           if(originalTask) {
             const existing = allScheduledTasks.find(t => t.id === entry.taskId);
             if (!existing) {
                allScheduledTasks.push({ ...originalTask, id: entry.taskId });
             }
           }
         });
       });
     });
     return allScheduledTasks;
  }, [generatedSchedule, tasks]);


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <AlertDialog open={showExtendDayDialog} onOpenChange={setShowExtendDayDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tasks don't fit in the working day</AlertDialogTitle>
            <AlertDialogDescription>
              Some tasks cannot be completed within the current working day ({workingDayHours[0]} hours). Would you like to extend the working day to fit all tasks?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleGenerateSchedule(true)}>
              Extend Working Day
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <Waypoints className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">RouteWise Scheduler</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".json"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload JSON
          </Button>
          <Button
            onClick={() => handleGenerateSchedule(false)}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? "Generating..." : "Generate Schedule"}
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Tabs defaultValue="setup">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="schedule" disabled={!generatedSchedule}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>
          <TabsContent value="setup">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users /> Targets
                  </CardTitle>
                  <CardDescription>
                    Select the targets (workers) to include in the schedule.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {targets.map((target) => (
                    <div
                      key={target.id}
                      className="flex items-start space-x-4 rounded-md border p-4"
                    >
                      <Checkbox
                        id={`target-${target.id}`}
                        checked={selectedTargetIds.has(target.id)}
                        onCheckedChange={(checked) =>
                          handleSelectTarget(target.id, !!checked)
                        }
                        className="mt-1"
                      />
                      <Avatar>
                        <AvatarImage src={target.avatarUrl} alt={target.name} data-ai-hint="person portrait" />
                        <AvatarFallback>
                          {target.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {target.name}
                        </p>
                        {target.skills && target.skills.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                            Skills: {target.skills.join(", ")}
                            </p>
                        )}
                         {target.schedules && target.schedules.length > 0 && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {target.schedules[0].dayStarts} - {target.schedules[0].dayEnds}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center">
                  <div className="grid gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <ListTodo />
                      Tasks
                    </CardTitle>
                    <CardDescription>
                      Select tasks to be scheduled.
                    </CardDescription>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Input
                      placeholder="Filter tasks..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={
                              selectedTaskIds.size > 0 &&
                              selectedTaskIds.size === filteredTasks.length &&
                              filteredTasks.length > 0
                            }
                            onCheckedChange={(checked) =>
                              handleSelectAllTasks(!!checked)
                            }
                          />
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => requestSort("name")}
                          >
                            Task Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => requestSort("type")}
                          >
                            Type
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => requestSort("duration")}
                          >
                            Duration (min)
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTaskIds.has(task.id)}
                              onCheckedChange={(checked) =>
                                handleSelectTask(task.id, !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {task.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              {taskTypeIcons[task.type]}
                              <span className="capitalize">{task.type}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>{task.location.address}</TableCell>
                           <TableCell>{task.startTime ? format(task.startTime, 'p') : 'N/A'}</TableCell>
                          <TableCell>{task.endTime ? format(task.endTime, 'p') : 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {task.duration}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings />
                    Scheduling Options
                  </CardTitle>
                  <CardDescription>
                    Adjust parameters for the scheduling algorithm.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="work-day">
                      Working Day Length: {workingDayHours[0]} hours
                    </Label>
                    <Slider
                      id="work-day"
                      min={4}
                      max={12}
                      step={0.5}
                      value={workingDayHours}
                      onValueChange={setWorkingDayHours}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle-speed">
                      Vehicle Speed (km/h)
                    </Label>
                    <Input
                      id="vehicle-speed"
                      type="number"
                      value={vehicleSpeed}
                      onChange={(e) => setVehicleSpeed(Math.min(999, Number(e.target.value)))}
                      max={999}
                      className="max-w-[150px]"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-start"
                        checked={includeHomeTravel.start}
                        onCheckedChange={(checked) =>
                          setIncludeHomeTravel((prev) => ({
                            ...prev,
                            start: !!checked,
                          }))
                        }
                      />
                      <Label
                        htmlFor="include-start"
                        className="flex items-center gap-2"
                      >
                        <Home className="h-4 w-4" />
                        Include travel from home
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-end"
                        checked={includeHomeTravel.end}
                        onCheckedChange={(checked) =>
                          setIncludeHomeTravel((prev) => ({
                            ...prev,
                            end: !!checked,
                          }))
                        }
                      />
                      <Label
                        htmlFor="include-end"
                        className="flex items-center gap-2"
                      >
                        <Home className="h-4 w-4" />
                        Include travel to home
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="schedule">
            {generatedSchedule && (
              <Tabs defaultValue="daily" className="mt-4">
                <div className="flex justify-between items-center">
                  <TabsList>
                    <TabsTrigger value="daily">Schedule View</TabsTrigger>
                    <TabsTrigger value="map">Map View</TabsTrigger>
                  </TabsList>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <TabsContent value="daily">
                  <Card>
                    <CardHeader>
                      <CardTitle>Schedule</CardTitle>
                      <CardDescription>
                        Visual timeline of tasks for each target for the selected period.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {displayedDates.map(date => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          const targetSchedules = generatedSchedule[dateStr] || [];

                          if(targetSchedules.every(ts => ts.schedule.length === 0)) return null;
                          
                          return (
                            <div key={dateStr}>
                              <h3 className="text-lg font-semibold mb-4">
                                {format(new Date(dateStr), "EEEE, MMMM do, yyyy")}
                              </h3>
                              <div className="space-y-8">
                                {targetSchedules.map((ts) => {
                                  if (ts.schedule.length === 0) return null;
                                  
                                  const target = targets.find(
                                    (t) => t.id === ts.targetId
                                  );
                                  if (!target) return null;
                                  
                                  const targetScheduleInfo = target.schedules?.[0];
                                  if (!targetScheduleInfo) return null;

                                  const [startHour, startMinute] = targetScheduleInfo.dayStarts.split(':').map(Number);
                                  const dayStartTime = setSeconds(setMinutes(setHours(startOfDay(date), startHour), startMinute), 0);
                                  
                                  const [endHour, endMinute] = targetScheduleInfo.dayEnds.split(':').map(Number);
                                  const dayEndTime = setSeconds(setMinutes(setHours(startOfDay(date), endHour), endMinute), 0);
                                  const totalWorkMinutes = (dayEndTime.getTime() - dayStartTime.getTime()) / 60000;


                                  return (
                                    <div key={ts.targetId}>
                                      <div className="flex items-center gap-3 mb-2">
                                        <Avatar>
                                          <AvatarImage src={target.avatarUrl} alt={target.name} data-ai-hint="person portrait" />
                                          <AvatarFallback>
                                            {target.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <h4 className="font-medium">{target.name}</h4>
                                      </div>
                                      <div className="relative h-12 w-full rounded-lg bg-secondary">
                                      {ts.schedule.map((entry, index) => {
                                        const task = allTasksForSchedule.find(t => t.id === entry.taskId);
                                        if (!task) return null;

                                        const start = new Date(entry.startTime);
                                        const end = new Date(entry.endTime);
                                        
                                        const startOffsetMinutes = (start.getTime() - dayStartTime.getTime()) / 60000;
                                        const durationMinutes = task.duration;

                                        const left = (startOffsetMinutes / totalWorkMinutes) * 100;
                                        const width = (durationMinutes / totalWorkMinutes) * 100;
                                        const segmentColor = stringToColor(task.segment);

                                        const travelTime = entry.travelTimeFromPrevious || 0;
                                        const travelWidth = (travelTime / totalWorkMinutes) * 100;
                                        const travelLeft = left - travelWidth;

                                        return (
                                          <React.Fragment key={entry.taskId}>
                                            {travelTime > 0 && (
                                               <TooltipProvider>
                                                 <Tooltip>
                                                   <TooltipTrigger asChild>
                                                      <div
                                                        className="absolute h-full bg-muted-foreground/30 rounded-md"
                                                        style={{
                                                          left: `${travelLeft}%`,
                                                          width: `${travelWidth}%`,
                                                        }}
                                                      />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>Travel Time: {travelTime} minutes</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                               </TooltipProvider>
                                            )}
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div
                                                    className="absolute h-full rounded-md p-2 flex items-center justify-center text-white text-xs font-bold shadow-md hover:opacity-90 transition-all"
                                                    style={{
                                                      left: `${left}%`,
                                                      width: `${width}%`,
                                                      backgroundColor: segmentColor,
                                                    }}
                                                  >
                                                    <span className="truncate">{task.name}</span>
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="font-semibold">{task.name}</p>
                                                  {task.segment && <p>Segment: {task.segment}</p>}
                                                  <p>
                                                    {format(start, 'p')} - {format(end, 'p')}
                                                  </p>
                                                  {task.repeatInterval && (
                                                    <p>Repeats every {task.repeatInterval} days</p>
                                                  )}
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </React.Fragment>
                                        );
                                      })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="map">
                  <MapView />
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

    

    

    

    

    