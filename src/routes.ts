import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './database';
import { authenticateToken } from './middleware/auth';
import { Request, Response, NextFunction } from 'express';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  	const { username, password } = req.body;
	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const [ result ] = await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
		res.status(201).json({ id: (result as any).insertId });
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});


router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const [ rows ] = await pool.execute('SELECT * FROM users WHERE username = ?', [ username ]);
    const user = (rows as any)[0];
    if (!user) {
      	return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      	return res.status(400).json({ error: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      	throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });
    res.json({ token });
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});

// Ruta para agregar un contacto (protegida)
router.post('/contact', authenticateToken, async (req: Request, res: Response) => {
	const { name, last_name, phone } = req.body;
	const userId = (req as any).user.id;
	try {
		const [result] = await pool.execute('INSERT INTO contacts (user_id, name, last_name, phone) VALUES (?, ?, ?, ?)', [userId, name, last_name, phone]);
		res.status(201).json({ id: (result as any).insertId });
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});


router.get('/contacts', authenticateToken, async (req: Request, res: Response) => {
	const userId = (req as any).user.id;
	try {
		const [rows] = await pool.execute('SELECT * FROM contacts WHERE user_id = ?', [userId]);
		res.json(rows);
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});

router.put('/contact/:id', authenticateToken, async (req: Request, res: Response) => {
	const { id } = req.params;
	const { name, last_name, phone } = req.body;
	const userId = (req as any).user.id;
	try {
		// Verificar si el contacto pertenece al usuario
		const [contactRows] = await pool.execute('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);
		const contact = (contactRows as any)[0];
		if (!contact) {
			return res.status(404).json({ error: 'Contacto no encontrado' });
		}

		// Actualizar el contacto en la base de datos
		const [result] = await pool.execute('UPDATE contacts SET name = ?, last_name = ?, phone = ? WHERE id = ?', [name, last_name, phone, id]);
		res.json({ message: 'Contacto actualizado correctamente' });
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});

router.delete('/contact/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  try {
    // Verificar si el contacto pertenece al usuario
    const [contactRows] = await pool.execute('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);
    const contact = (contactRows as any)[0];
    if (!contact) {
    	return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    // Eliminar el contacto de la base de datos
    const [result] = await pool.execute('DELETE FROM contacts WHERE id = ?', [id]);
    res.json({ message: 'Contacto eliminado correctamente' });
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});

export default router;