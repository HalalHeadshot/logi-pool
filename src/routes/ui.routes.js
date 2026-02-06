import express from 'express';
import { getUIData } from '../controllers/ui.controller.js';

const router = express.Router();

router.get('/ui-data', getUIData);

export default router;
