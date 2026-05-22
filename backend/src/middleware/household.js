import pool from '../db/pool.js';

/**
 * Middleware: householdGuard
 * 
 * Validates that the request comes from a valid, active household
 * and that the user belongs to it. Injects:
 *   - req.householdId
 *   - req.userId  
 *   - req.userRole ('super_admin' | 'admin' | 'member')
 */
export async function householdGuard(req, res, next) {
  const householdId = req.headers['x-household-id'];
  const userId = req.headers['x-user-id'];

  if (!householdId || !userId) {
    return res.status(401).json({ error: 'Credenciais de acesso ausentes' });
  }

  try {
    // 1. Validate household exists and is active
    const { rows: hRows } = await pool.query(
      'SELECT id, status FROM households WHERE id = $1',
      [householdId]
    );

    if (!hRows[0]) {
      return res.status(404).json({ error: 'Casa não encontrada' });
    }

    if (hRows[0].status === 'suspended') {
      return res.status(403).json({ error: 'Esta casa está suspensa. Contate o administrador do sistema.' });
    }

    // 2. Validate user belongs to household and is active
    const { rows: uRows } = await pool.query(
      'SELECT role, is_active FROM users WHERE id = $1 AND household_id = $2',
      [userId, householdId]
    );

    if (!uRows[0]) {
      return res.status(403).json({ error: 'Acesso negado: usuário não pertence a esta casa' });
    }

    if (!uRows[0].is_active) {
      return res.status(403).json({ error: 'Usuário inativo. Contate o administrador da casa.' });
    }

    // 3. Inject into request
    req.householdId = householdId;
    req.userId = userId;
    req.userRole = uRows[0].role;

    next();
  } catch (err) {
    console.error('❌ householdGuard error:', err.message);
    res.status(500).json({ error: 'Erro de autenticação interna' });
  }
}

/**
 * Middleware: requireRole
 * 
 * Must be used AFTER householdGuard.
 * Restricts access to specific roles.
 * 
 * Usage: requireRole('super_admin', 'admin')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    // super_admin always has access
    if (req.userRole === 'super_admin') {
      return next();
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Permissão insuficiente para esta ação' });
    }

    next();
  };
}
