import { Router } from 'express';
import { generateNewToken, logout, testApi } from '../controllers/auth.controller';
import { validateAccessToken, validateRefreshToken } from '../utils/validateToken';

const router = Router();

// auth routes
router.get('/', testApi);
router.post('/token', validateRefreshToken, generateNewToken);
router.delete('/logout', validateRefreshToken, logout);

export { router };
