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
  origin: true, // Allow all origins for debugging
  credentials: true,
};
app.use(cors(corsOptions));

// Use a consistent prefix so Vercel serverless (which keeps the /api segment
// in the incoming path) and local dev both match the same route shapes.
const apiPrefix = '/api';

app.post(`${apiPrefix}/webhook`, express.raw({ type: 'application/json' }), webhookController);

app.use(bodyParser.json({ limit: '25mb' })); 
app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));

app.get('/auth/callback', callbackController);
app.post('/auth/token', tokenController);

app.get('/', (req, res) => {
  res.json({ status: 'Stripe webhook server is running!' });
});

// Debug endpoint
app.get(`${apiPrefix}/test`, (req, res) => {
  res.json({ message: 'Backend is reachable', timestamp: new Date().toISOString() });
});

// Debug endpoint to list all routes
app.get(`${apiPrefix}/debug/routes`, (req, res) => {
  const routes = [];
  const addRoutes = (stack, prefix = '') => {
    stack.forEach(middleware => {
      if (middleware.route) {
        // Regular route
        const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
        routes.push(`${methods} ${prefix}${middleware.route.path}`);
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        // Nested router
        const path = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '')
          .replace(/\$/g, '');
        addRoutes(middleware.handle.stack, prefix + path);
      }
    });
  };
  addRoutes(app._router.stack);
  res.json({ routes: routes.sort() });
});

// ESG endpoints - BEFORE mounting /api routes
app.get(`${apiPrefix}/esg-request-status/:userId/:productId`, async (req, res) => {
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

app.post(`${apiPrefix}/send-esg-request`, async (req, res) => {
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
app.use(apiPrefix, apiRoutes);

// Only listen when not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`🧪 Health check:     http://localhost:${port}/`);
    console.log(`📬 Webhook endpoint: http://localhost:${port}/api/webhook`);
  });
}

// Export for Vercel serverless
export default app;

