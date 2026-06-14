import { useNavigate } from 'react-router-dom';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const navigate = useNavigate();

  function handleExit() {
    if (confirm('Exit GigaQuiz?')) window.close();
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>GigaQuiz</h1>

      <nav className={styles.menu}>
        <button className={styles.btnPrimary} onClick={() => navigate('/host')}>
          Host Game
        </button>
        <button className={styles.btn} onClick={() => navigate('/join')}>
          Join Game
        </button>
        <button className={styles.btn} onClick={() => navigate('/pack-builder')}>
          Pack Builder
        </button>
        <button className={styles.btn} onClick={() => navigate('/settings')}>
          Settings
        </button>
        <button className={styles.btnDanger} onClick={handleExit}>
          Exit
        </button>
      </nav>

      <p className={styles.footer}>
        Build your own packs in{' '}
        <a onClick={() => navigate('/pack-builder')} href="#">Pack Builder</a>
      </p>
    </div>
  );
}
