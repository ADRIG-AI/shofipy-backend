import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRoutes from './routes/index.js';
import { webhookController } from './controllers/webhook/stripeController.js';
import { callbackController } from './controllers/auth/callbackController.js';
import { tokenController } from './controllers/auth/tokenController.js';
import { verifySessionToken, optionalSessionToken } from './middleware/sessionToken.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sendMailTo from './utils/sendMailTo.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const corsOptions = {
  origin: [
    'http://localhost:8080',
    'https://shopify-frontend-pearl.vercel.app',
    'https://shopify-frontend-rouge.vercel.app',
    'https://www.shopifyq.com',
    'https://dagala-analytics.vercel.app'
  ],
  credentials: true,
};
app.use(cors(corsOptions));

app.post('/api/webhook', express.raw({ type: 'application/json' }), webhookController);

app.use(bodyParser.json({ limit: '25mb' })); 
app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));

app.get('/auth/callback', callbackController);
app.post('/auth/token', tokenController);

app.get('/', (req, res) => {
  res.json({ status: 'Stripe webhook server is running!' });
});

// ESG endpoints - BEFORE mounting /api routes
app.get('/api/esg-request-status/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const numericId = productId.toString().replace('gid://shopify/Product/', '');
    
    const { data, error } = await supabase
      .from('esg_requests')
      .select('*')
      .eq('user_id', userId)
      .or(`product_id.eq.${productId},product_id.eq.${numericId}`)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    res.status(200).json({ 
      hasRequested: !!data,
      requestData: data || null
    });
  } catch (error) {
    console.error('Error checking ESG request status:', error);
    res.status(500).json({ error: 'Failed to check request status' });
  }
});

app.post('/api/send-esg-request', async (req, res) => {
  try {
    const { vendorEmail, productName, vendorName, userId, productId } = req.body;
    
    if (!vendorEmail || !productName || !vendorName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (userId && productId) {
      const numericId = productId.toString().replace('gid://shopify/Product/', '');
      
      const { data: existingRequest } = await supabase
        .from('esg_requests')
        .select('*')
        .eq('user_id', userId)
        .or(`product_id.eq.${productId},product_id.eq.${numericId}`)
        .single();
      
      if (existingRequest) {
        return res.status(200).json({ 
          success: true, 
          message: 'Request already sent',
          alreadyRequested: true
        });
      }
    }
    
    const esgData = {
      vendorName,
      productName
    };
    
    await sendMailTo(vendorEmail, null, null, null, esgData);
    
    if (userId && productId) {
      const { error } = await supabase
        .from('esg_requests')
        .insert({
          user_id: userId,
          product_id: productId,
          vendor_email: vendorEmail,
          product_name: productName,
          vendor_name: vendorName,
          requested_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error storing ESG request:', error);
        return res.status(500).json({ error: 'Failed to store request in database' });
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'ESG registration request sent successfully' 
    });
  } catch (error) {
    console.error('Error sending ESG request:', error);
    res.status(500).json({ 
      error: 'Failed to send ESG registration request' 
    });
  }
});

// Mount API routes AFTER ESG endpoints
app.use('/api', apiRoutes);

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`🧪 Health check:     http://localhost:${port}/`);
  console.log(`📬 Webhook endpoint: http://localhost:${port}/api/webhook`);
});

// Export for Vercel serverless
export default app;
