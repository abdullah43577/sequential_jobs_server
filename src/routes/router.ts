import { Router } from 'express';
import { testApi } from '../controllers/auth.controller';
import { validateToken } from '../utils/validateToken';

const router = Router();

// auth routes
router.get('/', testApi);

export { router };
