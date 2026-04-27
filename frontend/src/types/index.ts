export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Room {
  id: string;
  name: string;
  gameType: 'monopoly' | 'werewolf';
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  host: User;
  createdAt: string;
}

export interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}
