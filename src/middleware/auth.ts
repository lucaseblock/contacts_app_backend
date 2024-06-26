import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Verificar que JWT_SECRET esté definido
const jwtSecret = process.env.JWT_SECRET as string;
if (!jwtSecret) {
	throw new Error('JWT_SECRET is not defined in environment variables');
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
	const token = req.header('Authorization')?.split(' ')[1];
	if (!token) {
		return res.status(401).json({ error: 'Access denied' });
	}
	try {
		const verified = jwt.verify(token, jwtSecret);
		(req as any).user = verified;
		next();
	} catch (err) {
		res.status(400).json({ error: 'Invalid token' });
	}
};