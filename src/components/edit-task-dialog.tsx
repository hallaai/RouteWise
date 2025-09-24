
"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskType } from "@/lib/types";

interface EditTaskDialogProps {
  task: Task | "new" | null;
  onSave: (task: Task) => void;
  onClose: () => void;
}

const taskTypes: TaskType[] = ['pickup', 'delivery', 'maintenance', 'installation', 'cleaning'];
const priorities = ['low', 'medium', 'high'];

// The format expected by <input type="datetime-local" />
const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

export function EditTaskDialog({ task, onSave, onClose }: EditTaskDialogProps) {
    const isNew = task === "new";
    const currentTask = isNew ? null : task;

    const [name, setName] = React.useState("");
    const [address, setAddress] = React.useState("");
    const [lat, setLat] = React.useState(0);
    const [lng, setLng] = React.useState(0);
    const [duration, setDuration] = React.useState(60);
    const [type, setType] = React.useState<TaskType>("maintenance");
    const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium");
    const [segment, setSegment] = React.useState<string | undefined>("");
    const [skills, setSkills] = React.useState<string[]>([]);
    const [newSkill, setNewSkill] = React.useState("");
    const [repeatInterval, setRepeatInterval] = React.useState<number | undefined>();
    const [startTime, setStartTime] = React.useState<string>("");
    const [endTime, setEndTime] = React.useState<string>("");


  React.useEffect(() => {
    if (currentTask) {
      setName(currentTask.name);
      setAddress(currentTask.location.address);
      setLat(currentTask.location.lat);
      setLng(currentTask.location.lng);
      setDuration(currentTask.duration);
      setType(currentTask.type);
      setPriority(currentTask.priority);
      setSegment(currentTask.segment);
      setSkills(currentTask.skills || []);
      setRepeatInterval(currentTask.repeatInterval);
      setStartTime(currentTask.startTime ? format(currentTask.startTime, DATETIME_LOCAL_FORMAT) : "");
      setEndTime(currentTask.endTime ? format(currentTask.endTime, DATETIME_LOCAL_FORMAT) : "");
    } else if (isNew) {
        // Reset for new task
        setName("");
        setAddress("");
        setLat(0);
        setLng(0);
        setDuration(60);
        setType("maintenance");
        setPriority("medium");
        setSegment("");
        setSkills([]);
        setRepeatInterval(undefined);
        setStartTime("");
        setEndTime("");
    }
  }, [task, currentTask, isNew]);

  if (!task) return null;

  const handleSave = () => {
    const parsedStartTime = startTime ? parse(startTime, DATETIME_LOCAL_FORMAT, new Date()) : undefined;
    const parsedEndTime = endTime ? parse(endTime, DATETIME_LOCAL_FORMAT, new Date()) : undefined;

    const updatedTask: Task = {
      id: currentTask?.id || 'new',
      name,
      location: { address, lat, lng },
      duration,
      type,
      priority,
      segment,
      skills,
      repeatInterval,
      startTime: parsedStartTime && isValid(parsedStartTime) ? parsedStartTime : undefined,
      endTime: parsedEndTime && isValid(parsedEndTime) ? parsedEndTime : undefined,
    };
    onSave(updatedTask);
  };

  const handleAddSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add New Task" : "Edit Task"}</DialogTitle>
           <DialogDescription>
            {isNew ? "Enter the details for the new task." : "Make changes to the task's details."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">Location</Label>
            <div className="col-span-3 grid grid-cols-2 gap-2">
                <Input id="lat" type="number" placeholder="Latitude" value={lat} onChange={e => setLat(parseFloat(e.target.value))} />
                <Input id="lng" type="number" placeholder="Longitude" value={lng} onChange={e => setLng(parseFloat(e.target.value))} />
            </div>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duration</Label>
            <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="col-span-3" placeholder="in minutes" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Select value={type} onValueChange={(value: TaskType) => setType(value)}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                    {taskTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">Priority</Label>
             <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                    {priorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="segment" className="text-right">Segment</Label>
            <Input id="segment" value={segment} onChange={(e) => setSegment(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">Start Time</Label>
            <Input id="startTime" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">End Time</Label>
            <Input id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="repeatInterval" className="text-right">Repeats (days)</Label>
            <Input 
                id="repeatInterval" 
                type="number" 
                value={repeatInterval === undefined ? '' : repeatInterval} 
                onChange={(e) => setRepeatInterval(e.target.value === '' ? undefined : Number(e.target.value))} 
                className="col-span-3" 
                placeholder="e.g., 7 for weekly"
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="skills" className="text-right">Skills</Label>
            <div className="col-span-3">
              <div className="flex gap-2">
                 <Input 
                   id="new-skill" 
                   value={newSkill} 
                   onChange={(e) => setNewSkill(e.target.value)} 
                   placeholder="Add required skill"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       handleAddSkill();
                     }
                   }}
                 />
                 <Button onClick={handleAddSkill} size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
               <div className="flex flex-wrap gap-2 mt-2">
                {skills.map(skill => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button onClick={() => handleRemoveSkill(skill)} className="rounded-full hover:bg-muted-foreground/20">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
           <Button variant="outline" onClick={onClose} className="mr-2">Cancel</Button>
           <Button onClick={handleSave}>Save Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    