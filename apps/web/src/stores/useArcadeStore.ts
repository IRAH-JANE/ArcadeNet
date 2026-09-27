import { create } from "zustand";
import type { RoomSnapshot } from "@arcadenet/shared";
interface S {
  playerId: string;
  username: string;
  room?: RoomSnapshot;
  setRoom: (room?: RoomSnapshot) => void;
}
export const useArcadeStore = create<S>((set) => ({
  playerId: crypto.randomUUID(),
  username: "Player-" + Math.floor(Math.random() * 9999),
  setRoom: (room) => set({ room }),
}));
