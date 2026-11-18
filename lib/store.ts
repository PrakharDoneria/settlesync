import { create } from 'zustand';
import type { Profile, Room } from './supabase';

interface AppStore {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;

  selectedRoomId: string | null;
  setSelectedRoomId: (roomId: string | null) => void;
  
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const STORAGE_KEY = 'settlesync_selected_room_id';

const getInitialRoomId = (): string | null => {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
  return null;
};

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  currentRoom: null,
  setCurrentRoom: (currentRoom) => {
    if (typeof window !== 'undefined' && currentRoom?.id) {
      try {
        localStorage.setItem(STORAGE_KEY, currentRoom.id);
      } catch {}
    }
    set({ currentRoom, selectedRoomId: currentRoom?.id || null });
  },

  selectedRoomId: getInitialRoomId(),
  setSelectedRoomId: (roomId) => {
    if (typeof window !== 'undefined') {
      try {
        if (roomId) {
          localStorage.setItem(STORAGE_KEY, roomId);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
    }
    set({ selectedRoomId: roomId });
  },
  
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
