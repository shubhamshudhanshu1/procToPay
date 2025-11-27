import { Router } from 'express';
import usersRouter from './users';

const router: Router = Router();

// Mount tenant-scoped routes
router.use('/', usersRouter);

export default router;

