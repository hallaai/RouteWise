
import type { Task, Target } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    name: 'Install new server',
    location: { address: '123 Tech Ave, Silicon Valley', lat: 37.3875, lng: -122.0575 },
    duration: 120,
    type: 'installation',
    priority: 'high',
  },
  {
    id: 'task-2',
    name: 'Deliver package to HQ',
    location: { address: '456 Business Blvd, Downtown', lat: 34.0522, lng: -118.2437 },
    duration: 30,
    type: 'delivery',
    priority: 'medium',
  },
  {
    id: 'task-3',
    name: 'Routine maintenance check',
    location: { address: '789 Residential Rd, Suburbia', lat: 34.1522, lng: -118.4437 },
    duration: 60,
    type: 'maintenance',
    priority: 'low',
  },
  {
    id: 'task-4',
    name: 'Pickup returned goods',
    location: { address: '101 Warehouse Way, Industrial Park', lat: 33.9522, lng: -118.1437 },
    duration: 45,
    type: 'pickup',
    priority: 'medium',
  },
  {
    id: 'task-5',
    name: 'Setup new workstation',
    location: { address: '212 Startup St, Innovation District', lat: 37.7749, lng: -122.4194 },
    duration: 90,
    type: 'installation',
    priority: 'medium',
  },
  {
    id: 'task-6',
    name: 'Emergency server repair',
    location: { address: '333 Enterprise Ct, Tech Campus', lat: 37.4220, lng: -122.0841 },
    duration: 180,
    type: 'maintenance',
    priority: 'high',
  },
  {
    id: 'task-7',
    name: 'Deliver sensitive documents',
    location: { address: '444 Finance Row, Financial District', lat: 34.0430, lng: -118.2523 },
    duration: 25,
    type: 'delivery',
    priority: 'high',
  },
  {
    id: 'task-8',
    name: 'Pickup equipment for repair',
    location: { address: '555 Garage Ave, Service Area', lat: 33.9876, lng: -118.3456 },
    duration: 50,
    type: 'pickup',
    priority: 'low',
  },
  {
    id: 'task-9',
    name: 'Finalize network installation',
    location: { address: '666 Connect Blvd, Communications Hub', lat: 34.0555, lng: -118.2333 },
    duration: 75,
    type: 'installation',
    priority: 'medium',
  },
  {
    id: 'task-10',
    name: 'Monthly AC maintenance',
    location: { address: '777 Comfort Ln, Residential Zone', lat: 34.1808, lng: -118.3090 },
    duration: 40,
    type: 'maintenance',
    priority: 'low',
  },
];

export const mockTargets: Target[] = [
  {
    id: 'target-1',
    name: 'Alex Johnson',
    skills: ['installation', 'maintenance'],
    home_location: { lat: 34.0522, lng: -118.2437 },
    avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar-1')?.imageUrl || '',
  },
  {
    id: 'target-2',
    name: 'Maria Garcia',
    skills: ['delivery', 'pickup'],
    home_location: { lat: 34.1522, lng: -118.4437 },
    avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar-2')?.imageUrl || '',
  },
  {
    id: 'target-3',
    name: 'Sam Chen',
    skills: ['maintenance', 'pickup', 'installation'],
    home_location: { lat: 33.9522, lng: -118.1437 },
    avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar-3')?.imageUrl || '',
  },
];
