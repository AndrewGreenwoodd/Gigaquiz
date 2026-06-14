import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameState } from '@gigaquiz/shared';
import { getSocket } from '../lib/socket';
import type { AppSocket } from '../lib/socket';

const S_ROOM = 'gq_room';
const S_PLAYER = 'gq_player';
const S_HOST = 'gq_host';

interface GameContextValue {
  socket: AppSocket;
  gameState: GameState | null;
  roomCode: string | null;
  isHost: boolean;
  myId: string | null;
  setRoomCode: (code: string) => void;
  setIsHost: (v: boolean) => void;
  saveSession: (roomCode: string, playerId: string, isHost: boolean) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const socket = useMemo(() => getSocket(), []);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(() => sessionStorage.getItem(S_ROOM));
  const [isHost, setIsHost] = useState(() => sessionStorage.getItem(S_HOST) === 'true');
  const [myId, setMyId] = useState<string | null>(() => sessionStorage.getItem(S_PLAYER));
  const navigate = useNavigate();

  const saveSession = useCallback((code: string, playerId: string, host: boolean) => {
    sessionStorage.setItem(S_ROOM, code);
    sessionStorage.setItem(S_PLAYER, playerId);
    sessionStorage.setItem(S_HOST, String(host));
    setRoomCode(code);
    setMyId(playerId);
    setIsHost(host);
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      const storedRoom = sessionStorage.getItem(S_ROOM);
      const storedPlayer = sessionStorage.getItem(S_PLAYER);
      const storedHost = sessionStorage.getItem(S_HOST) === 'true';
      if (!storedRoom || !storedPlayer) return;

      socket.emit('player:reconnect', { roomCode: storedRoom, playerId: storedPlayer }, (res) => {
        if ('error' in res) {
          sessionStorage.removeItem(S_ROOM);
          sessionStorage.removeItem(S_PLAYER);
          sessionStorage.removeItem(S_HOST);
          setRoomCode(null);
          setMyId(null);
          setIsHost(false);
          setGameState(null);
        } else {
          setRoomCode(storedRoom);
          setMyId(storedPlayer);
          setIsHost(storedHost);
          navigate('/game');
        }
      });
    });

    socket.on('game:state', setGameState);
    socket.on('game:ended', () => navigate('/game'));

    return () => {
      socket.off('connect');
      socket.off('game:state');
      socket.off('game:ended');
    };
  }, [socket, navigate]);

  return (
    <GameContext.Provider value={{ socket, gameState, roomCode, isHost, myId, setRoomCode, setIsHost, saveSession }}>
      {children}
    </GameContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
