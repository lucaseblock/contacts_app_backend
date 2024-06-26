import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
		req.user = verified as { id: number, iat: number, exp: number };
		next();
	} catch (err) {
		res.status(400).json({ error: 'Invalid token' });
	}
};