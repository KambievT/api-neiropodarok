import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { DayEntry, DayKey, EntriesByDay } from '../types';
import { getEntriesForUser, setEntriesForUser } from '../storage';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Требуется авторизация' });
  const data = await getEntriesForUser(req.user.id);
  return res.json(data);
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Требуется авторизация' });
  const body = req.body as EntriesByDay;
  await setEntriesForUser(req.user.id, body);
  return res.status(204).send();
});

router.post('/entry', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Требуется авторизация' });

  const { dayKey, entry } = req.body as { dayKey?: DayKey; entry?: DayEntry };
  if (!dayKey || !entry) {
    return res.status(400).json({ message: 'dayKey и entry обязательны' });
  }

  const current = await getEntriesForUser(req.user.id);
  const list = current[dayKey] ?? [];
  const next: EntriesByDay = {
    ...current,
    [dayKey]: [...list, entry],
  };
  await setEntriesForUser(req.user.id, next);
  return res.status(201).json(entry);
});

export default router;

