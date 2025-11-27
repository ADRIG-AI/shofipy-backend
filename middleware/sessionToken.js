import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const verifySessionToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  const sessionToken = authHeader.substring(7);
  
  try {
    // Decode without verification first to get the header
    const decoded = jwt.decode(sessionToken, { complete: true });
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid session token format' });
    }

    // Verify the token using Shopify's secret
    const secret = process.env.SHOPIFY_API_SECRET;
    const verified = jwt.verify(sessionToken, secret, { algorithms: ['HS256'] });
    
    // Add shop and user info to request
    req.shop = verified.dest;
    req.userId = verified.sub;
    req.sessionToken = verified;
    
    next();
  } catch (error) {
    console.error('Session token verification failed:', error);
    return res.status(401).json({ error: 'Invalid session token' });
  }
};

export const optionalSessionToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  
  try {
    // Try to decode without verification first to check if it's a Shopify session token
    const decoded = jwt.decode(token, { complete: true });
    
    if (decoded && decoded.payload && decoded.payload.iss && decoded.payload.iss.includes('shopify')) {
      // This is a Shopify session token
      const secret = process.env.SHOPIFY_API_SECRET;
      const verified = jwt.verify(token, secret, { algorithms: ['HS256'] });
      
      req.shop = verified.dest;
      req.userId = verified.sub;
      req.sessionToken = verified;
    }
    // If it's not a Shopify session token, just continue without setting session data
  } catch (error) {
    // Silently ignore verification errors for optional middleware
  }
  
  next();
};