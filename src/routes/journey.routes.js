import express from 'express';
import { getJourney, getJourneyQr } from '../controllers/journey.controller.js';

const router = express.Router();

router.get('/:id', getJourney);
router.get('/:id/qr', getJourneyQr);

export default router;
