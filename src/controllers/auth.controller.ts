import { Request, Response } from 'express';

const testApi = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'SERVERS ARE LIVE!!!' });
};

export { testApi };
