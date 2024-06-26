export interface MysqlError extends Error {
	code: string;
	errno: number;
	sqlState: string;
	sqlMessage: string;
}