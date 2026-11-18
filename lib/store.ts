import { create } from 'zustand';
import type { Profile, Room } from './supabase';

interface AppStore {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;
  
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  currentRoom: null,
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
