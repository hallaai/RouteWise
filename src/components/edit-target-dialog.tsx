"use client";

import * as React from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Target } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface EditTargetDialogProps {
  target: Target | null;
  onSave: (target: Target) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function EditTargetDialog({ target, onSave, onClose, onDelete }: EditTargetDialogProps) {
  const [name, setName] = React.useState("");
  const [skills, setSkills] = React.useState<string[]>([]);
  const [newSkill, setNewSkill] = React.useState("");
  const [homeLat, setHomeLat] = React.useState(0);
  const [homeLng, setHomeLng] = React.useState(0);
  const [dayStarts, setDayStarts] = React.useState("08:00");
  const [dayEnds, setDayEnds] = React.useState("16:00");
  const isNew = target ? target.id.startsWith('new-') : false;

  React.useEffect(() => {
    if (target) {
      setName(target.name);
      setSkills(target.skills || []);
      setHomeLat(target.home_location.lat);
      setHomeLng(target.home_location.lng);
      if(target.schedules && target.schedules.length > 0){
        setDayStarts(target.schedules[0].dayStarts);
        setDayEnds(target.schedules[0].dayEnds);
      }
    }
  }, [target]);

  if (!target) return null;

  const handleSave = () => {
    const updatedTarget: Target = {
      ...target,
      name,
      skills,
      home_location: { lat: homeLat, lng: homeLng },
      schedules: [{
        dayStarts,
        dayEnds,
        validFrom: '', // These are not used in the current implementation
        validTo: ''
      }],
      avatarUrl: target.avatarUrl || `https://picsum.photos/seed/${Math.random()}/200/200`
    };
    onSave(updatedTarget);
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
  
  const handleDelete = () => {
    if (target && !isNew) {
      onDelete(target.id);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add New Target" : "Edit Target"}</DialogTitle>
          <DialogDescription>
            {isNew ? "Enter the details for the new target." : "Make changes to the target's details."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="skills" className="text-right">
              Skills
            </Label>
            <div className="col-span-3">
              <div className="flex gap-2">
                 <Input 
                   id="new-skill" 
                   value={newSkill} 
                   onChange={(e) => setNewSkill(e.target.value)} 
                   placeholder="Add a skill"
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
           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="working-hours" className="text-right">
                Work Hours
              </Label>
              <div className="col-span-3 grid grid-cols-2 gap-2">
                 <Input id="dayStarts" type="time" value={dayStarts} onChange={(e) => setDayStarts(e.target.value)} />
                 <Input id="dayEnds" type="time" value={dayEnds} onChange={(e) => setDayEnds(e.target.value)} />
              </div>
           </div>
           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="home-location" className="text-right">
                Home (Lat, Lng)
              </Label>
               <div className="col-span-3 grid grid-cols-2 gap-2">
                 <Input id="homeLat" type="number" value={homeLat} onChange={(e) => setHomeLat(parseFloat(e.target.value))} />
                 <Input id="homeLng" type="number" value={homeLng} onChange={(e) => setHomeLng(parseFloat(e.target.value))} />
              </div>
           </div>
        </div>
        <DialogFooter className="flex justify-between w-full">
            <div>
              {!isNew && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to delete this target?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the target and remove them from any schedules.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
             <div>
                <Button variant="outline" onClick={onClose} className="mr-2">Cancel</Button>
                <Button onClick={handleSave}>Save changes</Button>
             </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
