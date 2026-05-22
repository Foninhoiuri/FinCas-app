import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pool from '../db/pool.js';
import { emit } from '../socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${req.params.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

// ─── Rotas de Autenticação ─────────────────────────────────────────

/**
 * POST /api/auth/validate-token
 * Valida o código de convite e retorna o household_id + nome
 * Body: { invite_token }
 */
router.post('/validate-token', async (req, res) => {
  try {
    const { invite_token } = req.body;
    if (!invite_token) return res.status(400).json({ error: 'Código da casa é obrigatório' });

    const { rows } = await pool.query(
      `SELECT id, name, status, currency FROM households WHERE invite_token = $1`,
      [invite_token.toUpperCase().trim()]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Código inválido. Verifique e tente novamente.' });
    if (rows[0].status === 'suspended') return res.status(403).json({ error: 'Esta casa está suspensa.' });

    res.json({ 
      household_id: rows[0].id, 
      household_name: rows[0].name,
      currency: rows[0].currency || 'BRL'
    });
  } catch (err) {
    console.error('❌ Token validation error:', err);
    res.status(500).json({ error: 'Erro ao validar código' });
  }
});

/**
 * GET /api/auth/validate-token
 * Apenas para informar que este endpoint deve ser POST
 */
router.get('/validate-token', (req, res) => {
  res.status(405).json({ 
    error: 'Método não permitido', 
    hint: 'Esta rota aceita apenas requisições POST com o corpo { invite_token }.' 
  });
});

// 1. LISTAR USUÁRIOS (SEGURO - SEM PIN)
router.get('/users', async (req, res) => {
  try {
    const { household_id } = req.query;

    if (!household_id) {
      return res.status(400).json({ error: 'household_id é obrigatório' });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, nickname, avatar_url, role, created_at 
       FROM users 
       WHERE household_id = $1 AND is_active = true 
       ORDER BY role, created_at`,
      [household_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
  try {
    const { identifier: idBody, username, user_id, pin } = req.body;
    const identifier = idBody || user_id || username;

    if (!identifier || !pin) return res.status(400).json({ error: 'Faltam dados' });

    const { rows: userRows } = await pool.query(
      'SELECT * FROM users WHERE id::text = $1 OR name = $1', 
      [identifier]
    );
    const user = userRows[0];

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!user.is_active) return res.status(403).json({ error: 'Usuário inativo. Contate o administrador.' });

    // Check if household is active
    let householdCurrency = 'BRL';
    if (user.household_id) {
      const { rows: hRows } = await pool.query('SELECT status, currency FROM households WHERE id = $1', [user.household_id]);
      householdCurrency = hRows[0]?.currency || 'BRL';
      if (hRows[0]?.status === 'suspended') {
        return res.status(403).json({ error: 'Casa suspensa. Contate o administrador do sistema.' });
      }
    }

    if (user.pin !== pin) return res.status(401).json({ error: 'PIN incorreto' });

    res.json({
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        nickname: user.nickname, 
        avatar_url: user.avatar_url,
        role: user.role,
        household_id: user.household_id,
        currency: householdCurrency
      },
      token: 'token-' + user.id
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    res.status(500).json({ error: 'Erro no login', details: err.message });
  }
});

// 3. PERFIL E PIN
router.get('/profile/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, name, email, nickname, avatar_url FROM users WHERE id = $1`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: '404' });
    res.json(rows[0]);
  } catch (err) { res.status(500).send(); }
});

// 4. ATUALIZAR PERFIL E AVATAR
router.post('/profile/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.params.id]);
    
    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar avatar' });
  }
});

router.patch('/profile/:id', async (req, res) => {
  try {
    const { name, nickname, email } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET 
        name = COALESCE($1, name),
        nickname = COALESCE($2, nickname),
        email = COALESCE($3, email),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name, nickname, email, req.params.id]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// 5. ALTERAR PIN
router.patch('/pin', async (req, res) => {
  try {
    const { user_id, current_pin, new_pin } = req.body;
    if (!user_id || !current_pin || !new_pin) {
      return res.status(400).json({ error: 'Faltam dados (user_id, current_pin ou new_pin)' });
    }

    // 1. Verificar se o PIN atual está correto
    const { rows } = await pool.query('SELECT pin FROM users WHERE id = $1', [user_id]);
    const user = rows[0];

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.pin !== current_pin) return res.status(401).json({ error: 'PIN atual incorreto' });

    // 2. Atualizar para o novo PIN
    await pool.query(
      'UPDATE users SET pin = $1, updated_at = NOW() WHERE id = $2',
      [new_pin, user_id]
    );

    res.json({ success: true, message: 'PIN alterado com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao alterar PIN:', err);
    res.status(500).json({ error: 'Erro ao alterar PIN' });
  }
});

export default router;
