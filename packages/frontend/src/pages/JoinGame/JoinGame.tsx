import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import styles from './JoinGame.module.css';

export default function JoinGame() {
  const navigate = useNavigate();
  const { socket, gameState, saveSession } = useGame();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gameState?.phase !== 'lobby' && joined) {
      navigate('/game');
    }
  }, [gameState, joined, navigate]);

  function handleJoin() {
    if (!code.trim() || !name.trim()) return;
    setError('');
    socket.emit('player:join', { roomCode: code.trim().toUpperCase(), displayName: name.trim() }, (res) => {
      if ('error' in res) { setError(res.error); return; }
      saveSession(code.trim().toUpperCase(), res.playerId, false);
      setJoined(true);
    });
  }

  if (joined) {
    const players = gameState?.players.filter((p) => !p.isHost) ?? [];
    return (
      <div className={styles.page}>
        <div className={styles.lobby}>
          <h2 className={styles.title}>In Lobby</h2>
          <p className={styles.waitMsg}>Waiting for the host to start the game…</p>
          <div className={styles.playerList}>
            {players.map((p) => (
              <div key={p.id} className={styles.playerItem}>{p.displayName}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Join Game</h1>
      <div className={styles.form}>
        <input
          className={styles.codeInput}
          placeholder="ROOM CODE"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <input
          className={styles.input}
          placeholder="Your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.joinBtn}
          disabled={!code.trim() || !name.trim()}
          onClick={handleJoin}
        >
          Join
        </button>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to menu</button>
      </div>
    </div>
  );
}
