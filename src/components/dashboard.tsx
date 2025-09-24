

"use client";

import * as React from "react";
import Link from 'next/link';
import {
  ArrowUpDown,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Download,
  Home,
  ListTodo,
  Map,
  Package,
  Settings,
  SlidersHorizontal,
  Trash2,
  Truck,
  Users,
  Waypoints,
  Wrench,
  Upload,
  Clock,
  Pencil,
  FileText,
  Repeat,
} from "lucide-react";
import { format, addMinutes, startOfDay, addDays, eachDayOfInterval, parseISO, setHours, setMinutes, setSeconds, isWithinInterval, isAfter } from "date-fns";
import type { DateRange } from "react-day-picker";
import dynamic from 'next/dynamic';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import type { Task, Target, GeneratedSchedule, TaskType, ScheduleEntry, TargetSchedule, AppState } from "@/lib/types";
import { cn, stringToColor } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { EditTargetDialog } from "./edit-target-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import { Separator } from "./ui/separator";
import { ReportView } from "./report-view";

const MapView = dynamic(() => import('./map-view').then(mod => mod.MapView), { 
  ssr: false,
  loading: () => <p>Loading map...</p> 
});


type SortConfig = {
  key: keyof Task;
  direction: "ascending" | "descending";
} | null;

type DeletionTarget = 
  | { type: 'day'; date: string }
  | { type: 'target'; date: string; targetId: string }
  | { type: 'task'; taskId: string };

const taskTypeIcons: Record<TaskType, JSX.Element> = {
  pickup: <Package className="h-4 w-4" />,
  delivery: <Truck className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  installation: <Settings className="h-4 w-4" />,
  cleaning: <Wrench className="h-4 w-4" />, // Example, choose a better icon if available
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

interface DashboardProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}


export function Dashboard({ appState, setAppState }: DashboardProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [targets, setTargets] = React.useState<Target[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(
    new Set()
  );
  const [selectedTargetIds, setSelectedTargetIds] = React.useState<
    Set<string>
  >(new Set());
  const [filter, setFilter] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedSchedule, setGeneratedSchedule] =
    React.useState<GeneratedSchedule | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [showExtendDayDialog, setShowExtendDayDialog] = React.useState(false);
  const [activeTaskGroups, setActiveTaskGroups] = React.useState<Set<string>>(new Set());
  const [editingTarget, setEditingTarget] = React.useState<Target | null>(null);
  const [editingTask, setEditingTask] = React.useState<Task | "new" | null>(null);
  const [deletionTarget, setDeletionTarget] = React.useState<DeletionTarget | null>(null);

  
  // Use state from props, but also check localStorage for client-side persistence
  React.useEffect(() => {
    const savedState = localStorage.getItem('appState');
    if (savedState) {
      setAppState(JSON.parse(savedState));
    }
     // Set initial date range on client to avoid hydration mismatch
    setDateRange({
        from: startOfDay(new Date()),
        to: addDays(startOfDay(new Date()), 6),
    });
  }, [setAppState]);

  const { workingDayHours, vehicleSpeed, includeHomeTravel, useTargetPhoto } = appState;

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
              id: work.referenceId || `task-${Date.now()}-${index}`,
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
              skills: work.skills?.map((skill: any) => typeof skill === 'object' && skill !== null ? skill.name : skill) || [],
              startTime: work.startTime ? parseISO(work.startTime) : undefined,
              endTime: work.endTime ? parseISO(work.endTime) : undefined,
              repeatInterval: work.repeatInterval,
            }));

            const newTargets: Target[] = data.targets.map((target: any, index: number) => ({
              id: target.referenceId || `target-${Date.now()}-${index}`,
              name: target.name,
              skills: target.skills?.map((skill: any) => typeof skill === 'object' && skill !== null ? skill.name : skill) || [],
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

    const handleDeleteSelectedTasks = () => {
    setTasks(prevTasks => prevTasks.filter(task => !selectedTaskIds.has(task.id)));
    setSelectedTaskIds(new Set());
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
    const handleSaveTarget = (updatedTarget: Target) => {
    if (updatedTarget.id.startsWith('new-')) {
       setTargets(prev => [...prev, { ...updatedTarget, id: `target-${Date.now()}` }]);
    } else {
       setTargets(prev => prev.map(t => t.id === updatedTarget.id ? updatedTarget : t));
    }
    setEditingTarget(null);
  };

  const handleSaveTask = (updatedTask: Task) => {
    if (updatedTask.id === 'new') {
        setTasks(prev => [...prev, { ...updatedTask, id: `task-${Date.now()}` }]);
    } else {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    }
    setEditingTask(null);
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
  
  const handleGenerateSchedule = (extendDay = false, force = false) => {
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
        
        let allTaskOccurrences: (Task & { occurrenceDate: Date, originalId: string })[] = [];
        
        originalTasksToSchedule.forEach(task => {
            if (task.repeatInterval && task.repeatInterval > 0 && task.startTime) {
                let currentDate = task.startTime;
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
            } else if (task.startTime && isWithinInterval(task.startTime, { start: today, end: endDay })) {
                allTaskOccurrences.push({ 
                    ...task, 
                    originalId: task.id, 
                    id: `${task.id}-${format(task.startTime, 'yyyy-MM-dd')}`, 
                    occurrenceDate: task.startTime
                });
            } else if (!task.startTime) { // For tasks without a start time, try to schedule on each day
                 datesToSchedule.forEach(d => {
                   const adhocTask = allTaskOccurrences.find(t => t.originalId === task.id)
                   if (!adhocTask) {
                        allTaskOccurrences.push({ 
                            ...task, 
                            originalId: task.id, 
                            id: `${task.id}-adhoc`, 
                            occurrenceDate: d 
                        });
                   }
                 });
            }
        });


        datesToSchedule.forEach(currentDate => {
            const dateStr = format(currentDate, "yyyy-MM-dd");
            schedule[dateStr] = [];

            let tasksForThisDay = allTaskOccurrences.filter(t => format(t.occurrenceDate, 'yyyy-MM-dd') === dateStr);
            let tasksToScheduleThisDay = new Set(tasksForThisDay);

            targetsForScheduling.forEach(target => {
                const targetScheduleInfo = target.schedules?.[0];
                if (!targetScheduleInfo) return;

                const [startHour, startMinute] = targetScheduleInfo.dayStarts.split(':').map(Number);
                let currentTime = setSeconds(setMinutes(setHours(currentDate, startHour), startMinute), 0);
                
                const [endHour, endMinute] = targetScheduleInfo.dayEnds.split(':').map(Number);
                const endOfDay = setSeconds(setMinutes(setHours(currentDate, endHour), endMinute), 0);
                const dayEndWithExtension = extendDay ? addMinutes(endOfDay, workingDayHours * 60) : endOfDay;

                const scheduledEntries: ScheduleEntry[] = [];
                let totalDuration = 0;
                let totalTravelTime = 0;
                let lastLocation = target.home_location;
                
                const route: TargetSchedule['route'] = [];

                // Simple greedy approach: sort tasks by priority or name and schedule them
                const tempTasks = Array.from(tasksToScheduleThisDay).sort((a,b) => a.name.localeCompare(b.name));

                for (const task of tempTasks) {
                    // Check if target has required skills
                    if (task.skills && task.skills.length > 0 && !task.skills.every(skill => target.skills.includes(skill))) {
                        continue;
                    }

                    const distance = getDistance(lastLocation.lat, lastLocation.lng, task.location.lat, task.location.lng);
                    const travelTime = Math.round((distance / vehicleSpeed) * 60); // in minutes

                    // Calculate earliest possible start time
                    const arrivalTime = addMinutes(currentTime, travelTime);
                    let taskStartTime = arrivalTime;
                    
                    if (task.startTime) {
                        const specificStartTime = setSeconds(setMinutes(setHours(currentDate, task.startTime.getHours()), task.startTime.getMinutes()), 0);
                        if (taskStartTime < specificStartTime) {
                            taskStartTime = specificStartTime; // Respect task's own start time
                        }
                    }

                    const taskEndTime = addMinutes(taskStartTime, task.duration);
                    
                    const specificEndTime = task.endTime ? setSeconds(setMinutes(setHours(currentDate, task.endTime.getHours()), task.endTime.getMinutes()), 0) : null;
                   
                    if (taskEndTime <= dayEndWithExtension && (!specificEndTime || taskEndTime <= specificEndTime)) {
                        scheduledEntries.push({
                            taskId: task.id,
                            startTime: taskStartTime.toISOString(),
                            endTime: taskEndTime.toISOString(),
                            travelTimeFromPrevious: travelTime,
                        });
                        
                        totalDuration += task.duration;
                        totalTravelTime += travelTime;
                        currentTime = taskEndTime;
                        lastLocation = task.location;
                        tasksToScheduleThisDay.delete(task); // Remove from pool for this day
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
        
      const allScheduledTaskIds = new Set<string>();
      Object.values(schedule).flat().forEach(ts => {
        ts.schedule.forEach(entry => {
            const originalId = allTaskOccurrences.find(t => t.id === entry.taskId)?.originalId;
            if (originalId) {
                allScheduledTaskIds.add(originalId);
            }
        });
      });

      const allSelectedOriginalIds = new Set(originalTasksToSchedule.map(t => t.id));
      const hasUnscheduledTasks = ![...allSelectedOriginalIds].every(id => allScheduledTaskIds.has(id));

      if (!force && hasUnscheduledTasks) {
        setShowExtendDayDialog(true);
        setIsLoading(false);
        return;
      }
      
      if (extendDay) {
        let maxRequiredHours = 0;
        for (const date in schedule) {
            for (const ts of schedule[date]) {
                const requiredMinutes = ts.totalDuration + ts.totalTravelTime;
                 const target = targets.find(t => t.id === ts.targetId);
                if (!target || !target.schedules || target.schedules.length === 0) continue;
                const [startHour, startMinute] = target.schedules[0].dayStarts.split(':').map(Number);
                const [endHour, endMinute] = target.schedules[0].dayEnds.split(':').map(Number);
                const baseWorkingMinutes = (endHour - startHour) * 60 + (endMinute - startMinute);

                if (requiredMinutes > baseWorkingMinutes) {
                    const extraHours = Math.ceil((requiredMinutes - baseWorkingMinutes) / 60);
                    if (extraHours > maxRequiredHours) {
                        maxRequiredHours = extraHours;
                    }
                }
            }
        }
        setAppState(prev => ({...prev, workingDayHours: Math.max(1, Math.min(12, maxRequiredHours)) }));
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
     const allScheduledTasks: (Task & { occurrenceDate?: Date, originalId: string })[] = [];
     Object.values(generatedSchedule).forEach(daySchedule => {
       daySchedule.forEach(ts => {
         ts.schedule.forEach(entry => {
           const originalTask = tasks.find(t => entry.taskId.startsWith(t.id));
           if(originalTask) {
             const existing = allScheduledTasks.find(t => t.id === entry.taskId);
             if (!existing) {
                allScheduledTasks.push({ 
                    ...originalTask, 
                    id: entry.taskId, 
                    originalId: originalTask.id 
                });
             }
           }
         });
       });
     });
     return allScheduledTasks;
  }, [generatedSchedule, tasks]);

  const tasksForMap = React.useMemo(() => {
    if (!generatedSchedule || !dateRange?.from) return [];
    const to = dateRange.to || dateRange.from;
    const interval = { start: dateRange.from, end: to };

    return allTasksForSchedule.filter(task => {
        const entry = Object.values(generatedSchedule)
            .flat()
            .flatMap(ts => ts.schedule)
            .find(e => e.taskId === task.id);
        if (!entry) return false;
        const startTime = parseISO(entry.startTime);
        return isWithinInterval(startTime, interval);
    });
  }, [generatedSchedule, dateRange, allTasksForSchedule]);

  const handleTaskGroupClick = (originalId: string, event: React.MouseEvent) => {
    setActiveTaskGroups(prev => {
      const newSet = new Set(prev);
      if (event.ctrlKey || event.metaKey) {
        if (newSet.has(originalId)) {
          newSet.delete(originalId);
        } else {
          newSet.add(originalId);
        }
      } else {
        if (newSet.has(originalId) && newSet.size === 1) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(originalId);
        }
      }
      return newSet;
    });
  };

  const scheduledTaskIds = React.useMemo(() => {
    if (!generatedSchedule) return new Set<string>();
    const ids = new Set<string>();
    Object.values(generatedSchedule).forEach(day => {
      day.forEach(targetSchedule => {
        targetSchedule.schedule.forEach(entry => {
          const originalTask = allTasksForSchedule.find(t => t.id === entry.taskId);
          if (originalTask?.originalId) {
            ids.add(originalTask.originalId);
          } else {
            const baseId = entry.taskId.split('-202')[0].replace('-adhoc','');
            ids.add(baseId);
          }
        });
      });
    });
    return ids;
  }, [generatedSchedule, allTasksForSchedule]);

  const handleDeleteScheduleEntries = (mode: 'single' | 'all-recurring') => {
    if (!deletionTarget || !generatedSchedule) return;

    const newSchedule = { ...generatedSchedule };
    let taskIdsToRemove = new Set<string>();
    let deletionDate: Date | null = null;

    if (deletionTarget.type === 'day') {
        (newSchedule[deletionTarget.date] || []).forEach(ts => {
            ts.schedule.forEach(entry => taskIdsToRemove.add(entry.taskId));
        });
        deletionDate = parseISO(deletionTarget.date);
    } else if (deletionTarget.type === 'target') {
        const ts = (newSchedule[deletionTarget.date] || []).find(ts => ts.targetId === deletionTarget.targetId);
        (ts?.schedule || []).forEach(entry => taskIdsToRemove.add(entry.taskId));
        deletionDate = parseISO(deletionTarget.date);
    } else if (deletionTarget.type === 'task') {
        taskIdsToRemove.add(deletionTarget.taskId);
        const entry = Object.values(newSchedule).flat().flatMap(ts => ts.schedule).find(e => e.taskId === deletionTarget.taskId);
        if (entry) {
            deletionDate = parseISO(entry.startTime);
        }
    }

    // If mode is 'all-recurring', find all future occurrences as well
    if (mode === 'all-recurring' && deletionDate) {
        const recurringOriginalIds = new Set<string>();
        taskIdsToRemove.forEach(taskId => {
            const task = allTasksForSchedule.find(t => t.id === taskId);
            if (task?.originalId && task.repeatInterval) {
                recurringOriginalIds.add(task.originalId);
            }
        });

        Object.keys(newSchedule).forEach(d => {
            if (isAfter(parseISO(d), deletionDate) || format(parseISO(d), 'yyyy-MM-dd') === format(deletionDate, 'yyyy-MM-dd')) {
                 newSchedule[d].forEach(ts => {
                    ts.schedule.forEach(entry => {
                        const task = allTasksForSchedule.find(t => t.id === entry.taskId);
                         if (task?.originalId && recurringOriginalIds.has(task.originalId)) {
                             taskIdsToRemove.add(entry.taskId);
                         }
                    });
                 });
            }
        });
    }

    // Now, filter the schedule
    Object.keys(newSchedule).forEach(d => {
        newSchedule[d] = newSchedule[d].map(ts => ({
            ...ts,
            schedule: ts.schedule.filter(entry => !taskIdsToRemove.has(entry.taskId))
        }));
    });

    setGeneratedSchedule(newSchedule);
    setDeletionTarget(null);
    toast({
        title: "Schedule Updated",
        description: "The selected tasks have been removed from the calendar."
    });
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExportJson = () => {
    if (!generatedSchedule) return;
    const dataToExport = {
      schedule: generatedSchedule,
      tasks: allTasksForSchedule,
      targets: targets.filter(t => selectedTargetIds.has(t.id)),
      dateRange,
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    downloadFile(jsonString, `schedule-export-${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
  };

  const handleExportCsv = () => {
    if (!generatedSchedule) return;
    let csvContent = "Date,Target Name,Task Name,Task Start Time,Task End Time,Task Duration (min),Travel Time (min),Task Address,Task Segment\n";
    
    Object.entries(generatedSchedule).forEach(([date, daySchedule]) => {
      daySchedule.forEach(targetSchedule => {
        const target = targets.find(t => t.id === targetSchedule.targetId);
        if (!target) return;
        
        targetSchedule.schedule.forEach(entry => {
          const task = allTasksForSchedule.find(t => t.id === entry.taskId);
          if (!task) return;
          
          const row = [
            date,
            target.name,
            task.name,
            format(parseISO(entry.startTime), 'p'),
            format(parseISO(entry.endTime), 'p'),
            task.duration,
            entry.travelTimeFromPrevious || 0,
            `"${task.location.address}"`,
            task.segment || ''
          ].join(',');
          csvContent += row + "\n";
        });
      });
    });

    downloadFile(csvContent, `schedule-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8;');
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <AlertDialog open={showExtendDayDialog} onOpenChange={setShowExtendDayDialog}>
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Tasks don't fit in the working day</AlertDialogTitle>
            <AlertDialogDescription>
              Some tasks cannot be completed within the current working day. You can extend the day to fit all tasks, or schedule only the tasks that fit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
             <Button variant="outline" onClick={() => handleGenerateSchedule(false, true)}>
              Schedule Without Extending
            </Button>
            <AlertDialogAction onClick={() => handleGenerateSchedule(true, true)}>
              Extend and Reschedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {deletionTarget && (
         <AlertDialog open={!!deletionTarget} onOpenChange={() => setDeletionTarget(null)}>
            <AlertDialogContent className="sm:max-w-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Clear scheduled tasks?</AlertDialogTitle>
                <AlertDialogDescription>
                This will remove tasks from the calendar. This action cannot be undone. How should recurring tasks be handled?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="outline" onClick={() => handleDeleteScheduleEntries('single')}>
                    Remove Only These Tasks
                </Button>
                <AlertDialogAction onClick={() => handleDeleteScheduleEntries('all-recurring')}>
                    Remove These and All Future Occurrences
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      )}

        {editingTarget && (
        <EditTargetDialog
          target={editingTarget}
          onSave={handleSaveTarget}
          onClose={() => setEditingTarget(null)}
          onDelete={(id) => {
            setTargets(prev => prev.filter(t => t.id !== id));
            setEditingTarget(null);
          }}
        />
      )}
      {editingTask && (
        <EditTaskDialog
          task={editingTask === 'new' ? {
              id: 'new',
              name: '',
              location: { address: '', lat: 0, lng: 0 },
              duration: 60,
              type: 'maintenance',
              priority: 'medium',
              skills: [],
          } : editingTask}
          onSave={handleSaveTask}
          onClose={() => setEditingTask(null)}
        />
      )}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <Waypoints className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">RouteWise Scheduler</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".json"
          />
           <Link href="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
             <Settings className="h-5 w-5" />
             <span>Settings</span>
          </Link>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload JSON
          </Button>
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
            <ResizablePanelGroup direction="horizontal" className="w-full rounded-lg border">
              <ResizablePanel defaultSize={30}>
                <Card className="h-full border-0">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users /> Targets
                        </CardTitle>
                        <CardDescription>
                          Select workers for the schedule.
                        </CardDescription>
                      </div>
                       <Button size="sm" onClick={() => setEditingTarget({ id: `new-${Date.now()}`, name: '', skills: [], home_location: { lat: 0, lng: 0 }, schedules: [{dayStarts: '08:00', dayEnds: '16:00', validFrom: '', validTo: ''}] })}>
                          Add Target
                        </Button>
                    </div>
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
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTarget(target)}>
                            <Pencil className="h-4 w-4" />
                         </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={70}>
                <Card className="h-full border-0">
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
                       {selectedTaskIds.size > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteSelectedTasks}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Selected ({selectedTaskIds.size})
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setEditingTask("new")}>Add Task</Button>
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
                          <TableHead>Type</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead>Skills</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Repeats (days)</TableHead>
                          <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => {
                          const isScheduled = generatedSchedule && scheduledTaskIds.has(task.id);
                          const isUnscheduled = generatedSchedule && !isScheduled && selectedTaskIds.has(task.id);
                          return(
                          <TableRow key={task.id} className={cn(isUnscheduled && "opacity-50")}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTaskIds.has(task.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectTask(task.id, !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium flex items-center gap-2">
                              {isScheduled && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                       <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>This task is scheduled.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                               )}
                               {isUnscheduled && <div className="w-4 h-4" />}
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
                            <TableCell>{task.segment}</TableCell>
                            <TableCell>{task.skills?.join(', ')}</TableCell>
                            <TableCell>{task.duration} min</TableCell>
                            <TableCell>{task.repeatInterval || 'N/A'}</TableCell>
                            <TableCell>
                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTask(task)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )})}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>
          <TabsContent value="schedule">
            {generatedSchedule && (
              <Tabs defaultValue="daily" className="mt-4">
                <div className="flex justify-between items-center">
                  <TabsList>
                    <TabsTrigger value="daily"><CalendarIcon className="mr-2 h-4 w-4" />Schedule View</TabsTrigger>
                    <TabsTrigger value="map"><Map className="mr-2 h-4 w-4" />Map View</TabsTrigger>
                    <TabsTrigger value="report"><FileText className="mr-2 h-4 w-4" />Report</TabsTrigger>
                  </TabsList>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleExportJson}>Export as JSON</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportCsv}>Export as CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <TabsContent value="daily">
                  <Card>
                    <CardContent className="space-y-4 pt-6">
                      {displayedDates.map((date, dateIndex) => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          const targetSchedules = generatedSchedule[dateStr] || [];

                          if(targetSchedules.every(ts => ts.schedule.length === 0)) return null;
                          
                          return (
                            <React.Fragment key={dateStr}>
                              <div className="flex gap-6 items-start">
                                <div className="flex flex-col items-center gap-2 sticky top-20">
                                   <div className="flex items-center gap-2 text-muted-foreground">
                                        <div className="flex flex-col items-center">
                                            <span className="font-semibold text-lg">{format(date, "d")}</span>
                                            <span>{format(date, "MMM")}</span>
                                        </div>
                                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeletionTarget({ type: 'day', date: dateStr })}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                  </div>
                                  <div style={{ writingMode: 'vertical-rl' }} className="text-sm text-muted-foreground rotate-180">
                                    {format(date, "EEEE")}
                                  </div>
                                </div>
                                <div className="flex-1 space-y-8">
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
                                          {useTargetPhoto && (
                                            <Avatar>
                                              <AvatarImage src={target.avatarUrl} alt={target.name} data-ai-hint="person portrait" />
                                              <AvatarFallback>
                                                {target.name.charAt(0)}
                                              </AvatarFallback>
                                            </Avatar>
                                          )}
                                          <h4 className="font-medium">{target.name}</h4>
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeletionTarget({ type: 'target', date: dateStr, targetId: ts.targetId })}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                        <div className="relative h-8 w-full rounded-lg bg-secondary">
                                        {ts.schedule.map((entry, index) => {
                                          const task = allTasksForSchedule.find(t => t.id === entry.taskId);
                                          if (!task || !task.originalId) return null;

                                          const start = new Date(entry.startTime);
                                          const end = new Date(entry.endTime);
                                          
                                          const startOffsetMinutes = (start.getTime() - dayStartTime.getTime()) / 60000;
                                          const durationMinutes = task.duration;

                                          const left = (startOffsetMinutes / totalWorkMinutes) * 100;
                                          const width = (durationMinutes / totalWorkMinutes) * 100;
                                          const segmentColor = stringToColor(task.segment || '');

                                          const travelTime = entry.travelTimeFromPrevious || 0;
                                          const travelWidth = (travelTime / totalWorkMinutes) * 100;
                                          const travelLeft = left - travelWidth;
                                          
                                          const isGroupActive = activeTaskGroups.has(task.originalId);

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
                                                      onClick={(e) => handleTaskGroupClick(task.originalId!, e)}
                                                      className={cn(
                                                        "absolute h-full rounded-md p-2 flex items-center justify-center text-white text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer",
                                                        isGroupActive && "ring-2 ring-offset-2 ring-accent"
                                                      )}
                                                      style={{
                                                        left: `${left}%`,
                                                        width: `${width}%`,
                                                        backgroundColor: segmentColor,
                                                      }}
                                                    >
                                                      <span className="truncate">{task.name}</span>
                                                    </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent className="w-64">
                                                    <div className="space-y-2">
                                                        <p className="font-semibold">{task.name}</p>
                                                        {task.segment && <p>Segment: {task.segment}</p>}
                                                        <p>
                                                          {format(start, 'p')} - {format(end, 'p')}
                                                        </p>
                                                        {task.repeatInterval && (
                                                          <p>Repeats every {task.repeatInterval} days</p>
                                                        )}
                                                        <Separator />
                                                        <Button variant="destructive" size="sm" className="w-full" onClick={() => setDeletionTarget({ type: 'task', taskId: task.id })}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Task
                                                        </Button>
                                                    </div>
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
                               {dateIndex < displayedDates.length - 1 && <Separator className="my-6" />}
                            </React.Fragment>
                          )
                        }
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="map">
                  <MapView 
                    tasks={tasksForMap} 
                    targets={targets}
                    schedule={generatedSchedule}
                    scheduledTaskIds={scheduledTaskIds} 
                    activeTaskGroups={activeTaskGroups}
                    />
                </TabsContent>
                <TabsContent value="report">
                  <ReportView 
                    schedule={generatedSchedule}
                    tasks={allTasksForSchedule}
                    targets={targets}
                    appState={appState}
                    displayedDates={displayedDates}
                  />
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

    

    




    






