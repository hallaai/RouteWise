
export type TaskType = 'pickup' | 'delivery' | 'maintenance' | 'installation' | 'cleaning';

export interface Task {
  id: string;
  name: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  duration: number; // in minutes
  type: TaskType;
  priority: 'low' | 'medium' | 'high';
  segment?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface TargetScheduleInfo {
  dayStarts: string;
  dayEnds: string;
  validFrom: string;
  validTo: string;
}

export interface Target {
  id: string;
  name: string;
  skills: string[];
  home_location: {
    lat: number;
    lng: number;
  };
  avatarUrl: string;
  schedules?: TargetScheduleInfo[];
}

export interface ScheduleEntry {
  taskId: string;
  startTime: string; // ISO 8601 format
  endTime: string;   // ISO 8601 format
}

export interface TargetSchedule {
  targetId: string;
  schedule: ScheduleEntry[];
  route: {
    taskId: string;
    travelTime: number; // in minutes
  }[];
  totalDuration: number; // in minutes
  totalTravelTime: number; // in minutes
}

export interface GeneratedSchedule {
  [date: string]: TargetSchedule[];
}
