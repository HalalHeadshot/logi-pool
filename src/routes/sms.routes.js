import express from 'express';
import { handleSMS } from '../controllers/sms.controller.js';

const router = express.Router();

router.post('/sms', handleSMS);

export default router;
