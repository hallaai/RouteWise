
"use client";

import * as React from "react";
import {
  ArrowUpDown,
  Calendar,
  ChevronDown,
  Clock,
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
} from "lucide-react";
import { format, addMinutes, startOfDay } from "date-fns";
import Image from "next/image";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { mockTasks, mockTargets } from "@/lib/data";
import type { Task, Target, GeneratedSchedule } from "@/lib/types";
import { MapView } from "./map-view";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type SortConfig = {
  key: keyof Task;
  direction: "ascending" | "descending";
} | null;

const taskTypeIcons = {
  pickup: <Package className="h-4 w-4" />,
  delivery: <Truck className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  installation: <Settings className="h-4 w-4" />,
};

const taskPriorityBadge = {
  low: "default",
  medium: "secondary",
  high: "destructive",
} as const;

export function Dashboard() {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>(mockTasks);
  const [targets, setTargets] = React.useState<Target[]>(mockTargets);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(
    new Set()
  );
  const [selectedTargetIds, setSelectedTargetIds] = React.useState<
    Set<string>
  >(new Set(mockTargets.map((t) => t.id)));
  const [workingDayHours, setWorkingDayHours] = React.useState([8]);
  const [includeHomeTravel, setIncludeHomeTravel] = React.useState({
    start: true,
    end: true,
  });
  const [filter, setFilter] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedSchedule, setGeneratedSchedule] =
    React.useState<GeneratedSchedule | null>(null);

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

  const handleGenerateSchedule = () => {
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

    // Mock AI processing time
    setTimeout(() => {
      // Mock schedule generation based on selected items
      const today = startOfDay(new Date());
      const todayStr = format(today, "yyyy-MM-dd");
      const schedule: GeneratedSchedule = {
        [todayStr]: Array.from(selectedTargetIds).map((targetId, index) => {
          const targetTasks = Array.from(selectedTaskIds).filter(
            (_, i) => i % selectedTargetIds.size === index
          );
          let currentTime = today;
          return {
            targetId: targetId,
            schedule: targetTasks.map((taskId) => {
              const task = tasks.find((t) => t.id === taskId)!;
              const startTime = currentTime;
              const endTime = addMinutes(startTime, task.duration);
              currentTime = addMinutes(endTime, 15); // Add travel time
              return {
                taskId: taskId,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              };
            }),
            route: [],
            totalDuration: targetTasks.reduce(
              (acc, taskId) =>
                acc + (tasks.find((t) => t.id === taskId)?.duration || 0),
              0
            ),
            totalTravelTime: (targetTasks.length - 1) * 15,
          };
        }),
      };
      setGeneratedSchedule(schedule);
      setIsLoading(false);
      toast({
        title: "Schedule Generated Successfully!",
        description: "View the new schedule in the 'Schedule' tab.",
      });
    }, 2000);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <Waypoints className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">RouteWise Scheduler</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={handleGenerateSchedule}
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
              <Calendar className="mr-2 h-4 w-4" />
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
                      className="flex items-center space-x-4 rounded-md border p-4"
                    >
                      <Checkbox
                        id={`target-${target.id}`}
                        checked={selectedTargetIds.has(target.id)}
                        onCheckedChange={(checked) =>
                          handleSelectTarget(target.id, !!checked)
                        }
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
                        <p className="text-sm text-muted-foreground">
                          Skills: {target.skills.join(", ")}
                        </p>
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
                <TabsList>
                  <TabsTrigger value="daily">Daily View</TabsTrigger>
                  <TabsTrigger value="map">Map View</TabsTrigger>
                </TabsList>
                <TabsContent value="daily">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Schedule</CardTitle>
                      <CardDescription>
                        Visual timeline of tasks for each target.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(generatedSchedule).map(
                        ([date, targetSchedules]) => (
                          <div key={date}>
                            <h3 className="text-lg font-semibold mb-4">
                              {format(new Date(date), "EEEE, MMMM do, yyyy")}
                            </h3>
                            <div className="space-y-8">
                              {targetSchedules.map((ts) => {
                                const target = targets.find(
                                  (t) => t.id === ts.targetId
                                )!;
                                const workingDayMinutes = workingDayHours[0] * 60;
                                
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
                                      {ts.schedule.map((entry) => {
                                        const task = tasks.find(
                                          (t) => t.id === entry.taskId
                                        )!;
                                        const start = new Date(entry.startTime);
                                        const end = new Date(entry.endTime);
                                        const startOfDayTime = startOfDay(start);
                                        const startOffsetMinutes = (start.getTime() - startOfDayTime.getTime()) / 60000;
                                        
                                        const durationMinutes = task.duration;

                                        const left = (startOffsetMinutes / workingDayMinutes) * 100;
                                        const width = (durationMinutes / workingDayMinutes) * 100;

                                        return (
                                          <TooltipProvider key={entry.taskId}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div
                                                  className="absolute h-full rounded-md p-2 flex items-center justify-center text-white text-xs font-bold shadow-md bg-primary/80 hover:bg-primary transition-all"
                                                  style={{
                                                    left: `${left}%`,
                                                    width: `${width}%`,
                                                  }}
                                                >
                                                  <span className="truncate">{task.name}</span>
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="font-semibold">{task.name}</p>
                                                <p>{task.location.address}</p>
                                                <p>
                                                  {format(start, 'p')} - {format(end, 'p')}
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
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
