import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import styles from './PackBuilder.module.css';

interface QDraft { text: string; answer: string; points: number; imageUrl: string; order: number; }
interface CatDraft { name: string; order: number; questions: QDraft[]; }

function emptyQ(order: number): QDraft { return { text: '', answer: '', points: (order + 1) * 100, imageUrl: '', order }; }
function emptyCat(order: number): CatDraft { return { name: '', order, questions: [0,1,2,3,4].map(emptyQ) }; }

export default function PackBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [timerDuration, setTimerDuration] = useState(5);
  const [isPublic, setIsPublic] = useState(true);
  const [categories, setCategories] = useState<CatDraft[]>([emptyCat(0)]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id) return;
    api.getPack(id).then((pack) => {
      setName(pack.name);
      setDescription(pack.description ?? '');
      setAuthorName(pack.authorName);
      setTimerDuration(pack.timerDuration);
      setIsPublic(pack.isPublic);
      setCategories(pack.categories.map((cat) => ({
        name: cat.name,
        order: cat.order,
        questions: cat.questions.map((q) => ({
          text: q.text,
          answer: q.answer,
          points: q.points,
          imageUrl: q.imageUrl ?? '',
          order: q.order,
        })),
      })));
    }).catch(() => setError('Failed to load pack'));
  }, [id]);

  function updateCategory(catIdx: number, key: keyof CatDraft, value: unknown) {
    setCategories((prev) => prev.map((c, i) => i === catIdx ? { ...c, [key]: value } : c));
  }

  function updateQuestion(catIdx: number, qIdx: number, key: keyof QDraft, value: unknown) {
    setCategories((prev) => prev.map((c, ci) =>
      ci === catIdx ? { ...c, questions: c.questions.map((q, qi) => qi === qIdx ? { ...q, [key]: value } : q) } : c
    ));
  }

  function addCategory() {
    setCategories((prev) => [...prev, emptyCat(prev.length)]);
  }

  function removeCategory(idx: number) {
    setCategories((prev) => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i })));
  }

  function addQuestion(catIdx: number) {
    setCategories((prev) => prev.map((c, ci) =>
      ci === catIdx ? { ...c, questions: [...c.questions, emptyQ(c.questions.length)] } : c
    ));
  }

  function removeQuestion(catIdx: number, qIdx: number) {
    setCategories((prev) => prev.map((c, ci) =>
      ci === catIdx ? { ...c, questions: c.questions.filter((_, qi) => qi !== qIdx).map((q, qi) => ({ ...q, order: qi })) } : c
    ));
  }

  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleImageUpload(catIdx: number, qIdx: number, file: File) {
    try {
      const { url } = await api.uploadImage(file);
      updateQuestion(catIdx, qIdx, 'imageUrl', url);
    } catch { setError('Image upload failed'); }
  }

  async function handleSave() {
    if (!name.trim() || !authorName.trim()) { setError('Name and author are required'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { name, description, authorName, isPublic, timerDuration, categories };
      if (id) {
        await api.updatePack(id, payload);
      } else {
        await api.createPack(payload);
      }
      setSuccess('Pack saved!');
      setTimeout(() => navigate('/'), 1200);
    } catch { setError('Failed to save pack'); }
    finally { setSaving(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 className={styles.title}>{id ? 'Edit Pack' : 'New Pack'}</h1>
      </div>

      <div className={styles.form}>
        {/* Pack meta */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Pack Name
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Science & History" />
          </label>
          <label className={styles.label}>
            Author Name
            <input className={styles.input} value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Your name" />
          </label>
          <label className={styles.label}>
            Description
            <input className={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </label>
          <label className={styles.label}>
            Timer (seconds)
            <input className={styles.input} type="number" min={1} max={60} value={timerDuration} onChange={(e) => setTimerDuration(Number(e.target.value))} />
          </label>
        </div>

        <label className={styles.toggle}>
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Make pack public (visible to all players)
        </label>

        {/* Categories */}
        <div>
          <p className={styles.sectionTitle}>Categories</p>
          <div className={styles.categories}>
            {categories.map((cat, ci) => (
              <div key={ci} className={styles.categoryCard}>
                <div className={styles.categoryHeader}>
                  <input
                    className={styles.categoryNameInput}
                    placeholder={`Category ${ci + 1} name`}
                    value={cat.name}
                    onChange={(e) => updateCategory(ci, 'name', e.target.value)}
                  />
                  {categories.length > 1 && (
                    <button className={styles.removeBtn} onClick={() => removeCategory(ci)}>Remove</button>
                  )}
                </div>

                <div className={styles.questions}>
                  {cat.questions.map((q, qi) => (
                    <div key={qi} className={styles.questionRow}>
                      <input
                        className={styles.questionTextInput}
                        placeholder="Question"
                        value={q.text}
                        onChange={(e) => updateQuestion(ci, qi, 'text', e.target.value)}
                      />
                      <input
                        className={styles.questionAnswerInput}
                        placeholder="Answer"
                        value={q.answer}
                        onChange={(e) => updateQuestion(ci, qi, 'answer', e.target.value)}
                      />
                      <input
                        className={styles.pointsInput}
                        type="number"
                        placeholder="Pts"
                        value={q.points}
                        onChange={(e) => updateQuestion(ci, qi, 'points', Number(e.target.value))}
                      />
                      <div className={styles.imageUpload}>
                        {q.imageUrl
                          ? <img src={q.imageUrl} className={styles.imagePreview} alt="q img" onClick={() => updateQuestion(ci, qi, 'imageUrl', '')} />
                          : (
                            <>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                ref={(el) => { fileInputs.current[`${ci}-${qi}`] = el; }}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(ci, qi, f); }}
                              />
                              <button className={styles.imageBtn} onClick={() => fileInputs.current[`${ci}-${qi}`]?.click()}>+ img</button>
                            </>
                          )}
                        {cat.questions.length > 1 && (
                          <button className={styles.removeBtn} style={{ fontSize: 11, padding: '3px 6px' }} onClick={() => removeQuestion(ci, qi)}>✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button className={styles.addQuestionBtn} onClick={() => addQuestion(ci)}>+ Add question</button>
              </div>
            ))}

            <button className={styles.addCategoryBtn} onClick={addCategory}>+ Add Category</button>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <div className={styles.actions}>
          <button className={styles.saveBtn} disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save Pack'}
          </button>
        </div>
      </div>
    </div>
  );
}
