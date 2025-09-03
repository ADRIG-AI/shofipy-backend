import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRoutes from './routes/index.js';
import { webhookController } from './controllers/webhook/stripeController.js';
import { callbackController } from './controllers/auth/callbackController.js';
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
    'https://www.shopifyq.com'
  ],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('/api/auth/*', cors(corsOptions));
app.post('/api/webhook', express.raw({ type: 'application/json' }), webhookController);

app.use(bodyParser.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));

app.get('/auth/callback', callbackController);

app.get('/', (req, res) => {
  res.json({ status: 'Stripe webhook server is running!' });
});

// ESG endpoints - BEFORE mounting /api routes
app.get('/api/esg-request-status/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    
    const { data, error } = await supabase
      .from('esg_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
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
      const { data: existingRequest } = await supabase
        .from('esg_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
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


app.post('/api/auth/token', async (req, res) => {
  try {
    const { code, shop, state } = req.body;
    
    if (!code || !shop || !state) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Exchange code for access token with Shopify
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token from Shopify');
    }

    const tokenData = await tokenResponse.json();
    
    res.json({
      success: true,
      access_token: tokenData.access_token
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

app.use('/api', apiRoutes);

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`🧪 Health check:     http://localhost:${port}/`);
  console.log(`📬 Webhook endpoint: http://localhost:${port}/api/webhook`);
});
