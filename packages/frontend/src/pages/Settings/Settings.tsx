import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Settings.module.css';

const TIMER_KEY = 'gigaquiz_timer_duration';

export function getDefaultTimer(): number {
  return parseInt(localStorage.getItem(TIMER_KEY) ?? '5', 10);
}

export default function Settings() {
  const navigate = useNavigate();
  const [timer, setTimer] = useState(getDefaultTimer);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem(TIMER_KEY, String(timer));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.field}>
          <p className={styles.label}>Default Buzzer Timer (seconds)</p>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={60}
              value={timer}
              onChange={(e) => setTimer(Number(e.target.value))}
            />
            <span className={styles.hint}>Time before players can buzz in</span>
          </div>
        </div>

        <button className={styles.saveBtn} onClick={handleSave}>Save Settings</button>
        {saved && <p className={styles.saved}>Settings saved!</p>}
      </div>
    </div>
  );
}
