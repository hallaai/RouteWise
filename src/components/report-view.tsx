
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { GeneratedSchedule, Task, Target, AppState } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface ReportViewProps {
  schedule: GeneratedSchedule | null;
  tasks: Task[];
  targets: Target[];
  appState: AppState;
  displayedDates: Date[];
}

interface DailyMetrics {
    date: string;
    taskCount: number;
    totalDistance: number;
    taskTime: number;
    travelTime: number;
    idleTime: number;
}

const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
}

export function ReportView({ schedule, tasks, targets, appState, displayedDates }: ReportViewProps) {
  const metrics = React.useMemo(() => {
    if (!schedule) return { total: null, daily: [] };

    const dailyMetrics: DailyMetrics[] = [];
    let totalTaskCount = 0;
    let totalDistance = 0;
    let totalTaskTime = 0;
    let totalTravelTime = 0;
    let totalIdleTime = 0;

    for (const date of displayedDates) {
        const dateStr = format(date, "yyyy-MM-dd");
        const daySchedule = schedule[dateStr];

        if (!daySchedule || daySchedule.every(ts => ts.schedule.length === 0)) continue;

        let dailyTaskCount = 0;
        let dailyDistance = 0;
        let dailyTaskTime = 0;
        let dailyTravelTime = 0;
        let dailyIdleTime = 0;

        for (const targetSchedule of daySchedule) {
            dailyTaskCount += targetSchedule.schedule.length;

            let lastTaskEndTime: Date | null = null;
            const target = targets.find(t => t.id === targetSchedule.targetId);
            
            if (target && target.schedules && target.schedules.length > 0) {
                 const [startHour, startMinute] = target.schedules[0].dayStarts.split(':').map(Number);
                 lastTaskEndTime = new Date(date);
                 lastTaskEndTime.setHours(startHour, startMinute, 0, 0);
            }


            for (const entry of targetSchedule.schedule) {
                const task = tasks.find(t => t.id === entry.taskId);
                if (!task) continue;

                dailyTaskTime += task.duration;
                dailyTravelTime += entry.travelTimeFromPrevious || 0;

                const distance = ((entry.travelTimeFromPrevious || 0) / 60) * appState.vehicleSpeed;
                dailyDistance += distance;

                const taskStartTime = parseISO(entry.startTime);
                if (lastTaskEndTime) {
                    const idle = (taskStartTime.getTime() - lastTaskEndTime.getTime()) / 60000 - (entry.travelTimeFromPrevious || 0);
                    if (idle > 0) {
                        dailyIdleTime += idle;
                    }
                }
                lastTaskEndTime = parseISO(entry.endTime);
            }
        }
        
        dailyMetrics.push({
            date: dateStr,
            taskCount: dailyTaskCount,
            totalDistance: dailyDistance,
            taskTime: dailyTaskTime,
            travelTime: dailyTravelTime,
            idleTime: dailyIdleTime,
        });

        totalTaskCount += dailyTaskCount;
        totalDistance += dailyDistance;
        totalTaskTime += dailyTaskTime;
        totalTravelTime += dailyTravelTime;
        totalIdleTime += dailyIdleTime;
    }


    return {
        total: {
            taskCount: totalTaskCount,
            totalDistance: totalDistance,
            taskTime: totalTaskTime,
            travelTime: totalTravelTime,
            idleTime: totalIdleTime,
        },
        daily: dailyMetrics,
    };
  }, [schedule, tasks, targets, appState.vehicleSpeed, displayedDates]);

  if (!metrics.total || metrics.total.taskCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report</CardTitle>
          <CardDescription>No data available. Generate a schedule to see the report.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>The report will appear here once a schedule is generated.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overall Summary</CardTitle>
          <CardDescription>
            Total metrics for the selected period from {format(displayedDates[0], "MMM d, yyyy")} to {format(displayedDates[displayedDates.length - 1], "MMM d, yyyy")}.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Tasks</p>
                    <p className="text-2xl font-bold">{metrics.total.taskCount}</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Distance</p>
                    <p className="text-2xl font-bold">{metrics.total.totalDistance.toFixed(1)} km</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Task Time</p>
                    <p className="text-2xl font-bold">{formatMinutes(metrics.total.taskTime)}</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Travel Time</p>
                    <p className="text-2xl font-bold">{formatMinutes(metrics.total.travelTime)}</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Idle Time</p>
                    <p className="text-2xl font-bold">{formatMinutes(metrics.total.idleTime)}</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
          <CardDescription>Metrics for each day in the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">Task Time</TableHead>
                <TableHead className="text-right">Travel Time</TableHead>
                <TableHead className="text-right">Idle Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.daily.map((day) => (
                <TableRow key={day.date}>
                  <TableCell className="font-medium">{format(parseISO(day.date), "EEE, MMM d")}</TableCell>
                  <TableCell className="text-right">{day.taskCount}</TableCell>
                  <TableCell className="text-right">{day.totalDistance.toFixed(1)} km</TableCell>
                  <TableCell className="text-right">{formatMinutes(day.taskTime)}</TableCell>
                  <TableCell className="text-right">{formatMinutes(day.travelTime)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={day.idleTime > 60 ? "destructive" : "secondary"}>
                      {formatMinutes(day.idleTime)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
