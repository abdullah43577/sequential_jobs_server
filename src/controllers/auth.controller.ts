import { Request, Response } from 'express';
import RefreshToken from '../models/tokens.model';
import { generateAccessToken } from '../utils/generateToken';
import { IUserRequest } from '../utils/validateToken';

const testApi = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'SERVERS ARE LIVE!!!' });
};

const generateNewToken = async (req: IUserRequest, res: Response) => {
  try {
    const { refreshToken, userId } = req;

    const refreshTokens = await RefreshToken.find({});
    if (!refreshTokens.includes(refreshToken)) return res.status(401).json({ message: '' });

    const accessToken = generateAccessToken(userId as string);
    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server error', error });
  }
};

const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    let refreshTokens = await RefreshToken.find({});
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server error', error });
  }
};

export { testApi, generateNewToken, logout };
