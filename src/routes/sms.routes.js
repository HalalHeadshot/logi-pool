import express from 'express';
import { handleSMS } from '../controllers/sms.controller.js';

const router = express.Router();

router.post('/', handleSMS);
router.post('/webhook', handleSMS);  // httpSMS will send incoming SMS here

export default router;
