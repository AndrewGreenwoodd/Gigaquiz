import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import styles from './Game.module.css';

export default function Game() {
  const navigate = useNavigate();
  const { socket, gameState, isHost, myId, roomCode } = useGame();

  const [timerPct, setTimerPct] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (gameState?.phase !== 'question-active' || !gameState.timerEndsAt) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    const total = gameState.timerDuration * 1000;
    const endsAt = gameState.timerEndsAt;
    const tick = () => setTimerPct(Math.max(0, ((endsAt - Date.now()) / total) * 100));
    tick();
    timerRef.current = setInterval(tick, 100);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [gameState?.phase, gameState?.timerEndsAt, gameState?.timerDuration]);

  if (!gameState) {
    if (roomCode) {
      return <div className={styles.gameOver}><p>Reconnecting…</p></div>;
    }
    return <div className={styles.gameOver}><p>No active game. <button className={styles.homeBtn} onClick={() => navigate('/')}>Home</button></p></div>;
  }

  if (gameState.phase === 'game-over') {
    const sortedPlayers = [...gameState.players].filter((p) => !p.isHost).sort((a, b) => b.score - a.score);
    return (
      <div className={styles.gameOver}>
        <h1 className={styles.winnerTitle}>Game Over!</h1>
        {gameState.winner && (
          <>
            <p style={{ color: 'var(--text-muted)' }}>Winner</p>
            <p className={styles.winnerName}>{gameState.winner.displayName}</p>
          </>
        )}
        <div className={styles.finalScores}>
          {sortedPlayers.map((p) => (
            <div key={p.id} className={styles.finalRow}>
              <span>{p.displayName}</span>
              <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>{p.score} pts</span>
            </div>
          ))}
        </div>
        <button className={styles.homeBtn} onClick={() => navigate('/')}>Back to Menu</button>
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === myId);
  const numCols = gameState.categories.length;
  const numRows = gameState.board[0]?.length ?? 0;

  const showQuestion = ['question-active', 'buzzer-open', 'awaiting-verification'].includes(gameState.phase);
  const canBuzz = gameState.phase === 'buzzer-open' && !isHost && me && !me.hasAnsweredCurrentQuestion;
  const showHostPanel = isHost && gameState.phase === 'awaiting-verification' && gameState.buzzedPlayerId;

  function handleCellClick(categoryId: string, questionId: string) {
    if (gameState?.phase !== 'question-selection') return;
    if (gameState.activePlayerId !== myId) return;
    socket.emit('player:select-question', { categoryId, questionId });
  }

  function handleBuzz() {
    socket.emit('player:buzz', {});
  }

  function handleVerify(correct: boolean) {
    socket.emit('host:verify', { correct });
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.topBarTitle}>GigaQuiz</span>
        <span className={styles.topBarCode}>{roomCode}</span>
      </div>

      <div className={styles.main}>
        {/* Scoreboard */}
        <aside className={styles.sidebar}>
          <p className={styles.sidebarTitle}>Scores</p>
          {gameState.players.filter((p) => !p.isHost).map((p) => (
            <div key={p.id} className={p.id === gameState.activePlayerId ? styles.playerActive : styles.player}>
              <span className={styles.playerName}>{p.displayName}{p.id === myId ? ' (you)' : ''}</span>
              <span className={styles.playerScore}>{p.score}</span>
            </div>
          ))}
        </aside>

        {/* Board */}
        <div className={styles.boardArea}>
          <div
            className={styles.board}
            style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
          >
            {gameState.categories.map((cat) => (
              <div key={cat.id} className={styles.categoryHeader}>{cat.name}</div>
            ))}
            {Array.from({ length: numRows }).map((_, rowIdx) =>
              gameState.categories.map((cat, colIdx) => {
                const cell = gameState.board[colIdx]?.[rowIdx];
                if (!cell) return null;
                const canSelect = gameState.phase === 'question-selection' && gameState.activePlayerId === myId;
                return (
                  <button
                    key={`${cat.id}-${rowIdx}`}
                    className={cell.answered ? styles.cellAnswered : canSelect ? styles.cellClickable : styles.cell}
                    onClick={() => !cell.answered && canSelect && handleCellClick(cat.id, cell.question.id)}
                    disabled={cell.answered || !canSelect}
                  >
                    {cell.answered ? '' : cell.question.points}
                  </button>
                );
              })
            )}
          </div>

          {gameState.phase === 'question-selection' && (
            <p className={styles.phaseMsg}>
              {gameState.activePlayerId === myId
                ? 'Your turn — pick a question!'
                : `Waiting for ${gameState.players.find((p) => p.id === gameState.activePlayerId)?.displayName ?? '...'} to pick…`}
            </p>
          )}
        </div>
      </div>

      {/* Question overlay */}
      {showQuestion && gameState.currentQuestion && (
        <div className={styles.overlay}>
          <div className={styles.questionCard}>
            <p className={styles.questionPoints}>{gameState.currentQuestion.points} pts</p>
            <p className={styles.questionText}>{gameState.currentQuestion.text}</p>
            {gameState.currentQuestion.imageUrl && (
              <img src={gameState.currentQuestion.imageUrl} className={styles.questionImage} alt="" />
            )}
          </div>

          {/* Timer bar */}
          {gameState.phase === 'question-active' && (
            <div className={styles.timerBar}>
              <div
                className={timerPct < 30 ? styles.timerFillLow : styles.timerFill}
                style={{ width: `${timerPct}%`, transition: `width 0.1s linear` }}
              />
            </div>
          )}

          {/* Buzz button (players only) */}
          {!isHost && gameState.phase !== 'awaiting-verification' && (
            <button className={styles.buzzBtn} disabled={!canBuzz} onClick={handleBuzz}>
              BUZZ!
            </button>
          )}

          {/* Who buzzed */}
          {gameState.buzzedPlayerId && gameState.buzzedPlayerName && (
            <p className={styles.buzzedMsg}>{gameState.buzzedPlayerName} buzzed in!</p>
          )}

          {/* Host verification panel */}
          {showHostPanel && (
            <div className={styles.hostPanel}>
              <p className={styles.hostPanelLabel}>Correct Answer</p>
              <p className={styles.correctAnswer}>{gameState.currentQuestion.answer}</p>
              <div className={styles.hostBtns}>
                <button className={styles.correctBtn} onClick={() => handleVerify(true)}>Correct ✓</button>
                <button className={styles.wrongBtn} onClick={() => handleVerify(false)}>Wrong ✗</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
