// import express from 'express';
// import cors from 'cors';
// import bodyParser from 'body-parser';
// import apiRoutes from './routes/index.js';
// import { webhookController } from './controllers/webhook/stripeController.js';
// import dotenv from 'dotenv';

// dotenv.config();
// const app = express();
// const port = process.env.PORT || 3000;

// const corsOptions = {
//   origin: 'http://localhost:8080',
//   credentials: true,
// };

// app.use(cors(corsOptions));

// // Define webhook endpoint with raw body parser exclusion
// app.post('/api/webhook', express.raw({type: 'application/json'}), webhookController);

// app.use(bodyParser.json());

// // Mount API routes
// app.use('/api', apiRoutes);

// // Basic health check endpoint
// app.get('/', (req, res) => {
//     res.json({ status: 'Stripe webhook server is running!' });
// });

// // Start server
// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
//     console.log(`Health check: http://localhost:${port}`);
//     console.log(`Webhook endpoint: http://localhost:${port}/api/webhook`);
// });
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRoutes from './routes/index.js';
import { webhookController } from './controllers/webhook/stripeController.js';
import { callbackController } from './controllers/auth/callbackController.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    'http://localhost:8080',
    'https://shopify-frontend-pearl.vercel.app',
    'https://shopify-frontend-rouge.vercel.app'
  ],
  credentials: true,
};
app.use(cors(corsOptions));

app.post('/api/webhook', express.raw({ type: 'application/json' }), webhookController);

app.use(bodyParser.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));

app.get('/auth/callback', callbackController);

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'Stripe webhook server is running!' });
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`🧪 Health check:     http://localhost:${port}/`);
  console.log(`📬 Webhook endpoint: http://localhost:${port}/api/webhook`);
});
