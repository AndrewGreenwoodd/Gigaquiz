import { Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import MainMenu from './pages/MainMenu/MainMenu';
import HostGame from './pages/HostGame/HostGame';
import JoinGame from './pages/JoinGame/JoinGame';
import Game from './pages/Game/Game';
import PackBuilder from './pages/PackBuilder/PackBuilder';
import Settings from './pages/Settings/Settings';

export default function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/host" element={<HostGame />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/game" element={<Game />} />
        <Route path="/pack-builder" element={<PackBuilder />} />
        <Route path="/pack-builder/:id" element={<PackBuilder />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GameProvider>
  );
}
