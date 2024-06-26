import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins: string[] = ['http://localhost:4200', 'https://lucaseblock.github.io'];

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string;
	if (allowedOrigins.includes(origin)) {
		res.header('Access-Control-Allow-Origin', origin);
	}
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.options('*', (req: Request, res: Response) => {
	const origin = req.headers.origin as string;
	if (allowedOrigins.includes(origin)) {
		res.header('Access-Control-Allow-Origin', origin);
	}
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	res.send();
});

app.use('/api', routes);

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});