import express from 'express';
import bodyParser from 'body-parser';
import smsRoutes from './routes/sms.routes.js';

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/', smsRoutes);

app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});
