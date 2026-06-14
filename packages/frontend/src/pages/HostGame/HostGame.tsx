import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QuestionPack } from '@gigaquiz/shared';
import { api } from '../../lib/api';
import { useGame } from '../../context/GameContext';
import styles from './HostGame.module.css';

export default function HostGame() {
  const navigate = useNavigate();
  const { socket, gameState, saveSession } = useGame();

  const [packs, setPacks] = useState<QuestionPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<QuestionPack | null>(null);
  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomCode, _setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    api.getPacks()
      .then(setPacks)
      .catch(() => setError('Failed to load packs'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!selectedPack || !hostName.trim()) return;
    setError('');
    socket.emit('host:create-room', { packId: selectedPack.id, hostName: hostName.trim() }, (res) => {
      if ('error' in res) { setError(res.error); return; }
      _setRoomCode(res.roomCode);
      saveSession(res.roomCode, res.playerId, true);
    });
  }

  function handleStart() {
    socket.emit('host:start-game', {}, (res) => {
      if ('error' in res) { setError(res.error); return; }
      navigate('/game');
    });
  }

  if (roomCode) {
    const players = gameState?.players.filter((p) => !p.isHost) ?? [];
    return (
      <div className={styles.page}>
        <div className={styles.lobby}>
          <h1 className={styles.title}>Waiting for players…</h1>
          <div className={styles.codeBox}>
            <p className={styles.codeLabel}>Room Code</p>
            <p className={styles.code}>{roomCode}</p>
          </div>
          <div className={styles.playerList}>
            {players.length === 0
              ? <p className={styles.loading}>No players yet</p>
              : players.map((p) => (
                  <div key={p.id} className={styles.playerItem}>{p.displayName}</div>
                ))}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button
            className={styles.startBtn}
            disabled={players.length === 0}
            onClick={handleStart}
          >
            Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 className={styles.title}>Host a Game</h1>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>1. Select a Question Pack</p>
        {loading && <p className={styles.loading}>Loading packs…</p>}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.packList}>
          {packs.map((pack) => (
            <button
              key={pack.id}
              className={selectedPack?.id === pack.id ? styles.packCardSelected : styles.packCard}
              onClick={() => setSelectedPack(pack)}
            >
              <p className={styles.packName}>{pack.name}</p>
              <p className={styles.packMeta}>
                {pack.categories.length} categories · by {pack.authorName}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>2. Your display name</p>
        <div className={styles.hostForm}>
          <input
            className={styles.input}
            placeholder="Host name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            className={styles.createBtn}
            disabled={!selectedPack || !hostName.trim()}
            onClick={handleCreate}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}
