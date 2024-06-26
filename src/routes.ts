import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './database';
import { authenticateToken } from './middleware/auth';
import { Request, Response } from 'express';
import { MysqlError } from './types/mysqlerror';
import { ResultSetHeader } from 'mysql2';
import { User } from './types/user';
import { Contact } from './types/contact';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  	const { username, password } = req.body;
	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const [ result ] = await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [ username, hashedPassword ]);
		res.status(201).json({ id: (result as ResultSetHeader).insertId });
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
		const user = (rows as User[])[0];
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

router.post('/contact', authenticateToken, async (req: Request, res: Response) => {
	const { name, last_name, phone } = req.body;
	const userId = req.user.id;
	try {
		const [ result ] = await pool.execute('INSERT INTO contacts (user_id, name, last_name, phone) VALUES (?, ?, ?, ?)', [ userId, name, last_name, phone ]);
		res.status(201).json({ id: (result as ResultSetHeader).insertId });
	} catch (err) {
		const mysqlError = err as MysqlError;
		if (mysqlError.code === 'ER_DUP_ENTRY') {
			res.status(500).json({ error: 'This phone number is already booked' });
		} else if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});

router.get('/contacts', authenticateToken, async (req: Request, res: Response) => {
	const userId = req.user.id;
	try {
		const [ rows ] = await pool.execute('SELECT * FROM contacts WHERE user_id = ?', [ userId ]);
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
	const userId = req.user.id;
	try {
		const [ contactRows ] = await pool.execute('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [ id, userId ]);
		const contact = (contactRows as Contact[])[0];
		if (!contact) {
			return res.status(404).json({ error: 'Contact not found' });
		}
		await pool.execute('UPDATE contacts SET name = ?, last_name = ?, phone = ? WHERE id = ?', [ name, last_name, phone, id ]);
		res.json({ message: 'Contact updated' });
	} catch (err) {
		const mysqlError = err as MysqlError;
		if (mysqlError.code === 'ER_DUP_ENTRY') {
			res.status(500).json({ error: 'This phone number is already booked' });
		} else if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});

router.delete('/contact/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const [ contactRows ] = await pool.execute('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [ id, userId ]);
    const contact = (contactRows as Contact[])[0];
    if (!contact) {
    	return res.status(404).json({ error: 'Contact not found' });
    }

    await pool.execute('DELETE FROM contacts WHERE id = ?', [ id ]);
    res.json({ message: 'Contact deleted' });
	} catch (err) {
		if (err instanceof Error) {
			res.status(500).json({ error: err.message });
		} else {
			res.status(500).json({ error: 'Unknown error' });
		}
	}
});

export default router;