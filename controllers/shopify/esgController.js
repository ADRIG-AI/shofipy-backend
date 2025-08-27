import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const getVendorSymbol = (vendorName) => {
  const vendorSymbolMap = {
    'Nike': 'NKE', 'Apple': 'AAPL', 'Microsoft': 'MSFT', 'Amazon': 'AMZN', 'Google': 'GOOGL', 'Tesla': 'TSLA',
    'Alphabet': 'GOOGL', 'Meta': 'META', 'Netflix': 'NFLX'
  };
  return vendorSymbolMap[vendorName] || null;
};

const calculateRiskLevel = (esgScore) => {
  if (esgScore >= 70) return 'low';
  if (esgScore >= 50) return 'medium';
  return 'high';
};

const getESGData = (symbol) => {
  const esgData = {
    'NKE': { totalESGScore: 61.2, environmentScore: 73.1, socialScore: 68.5, governanceScore: 42.0 },
    'AAPL': { totalESGScore: 56.04, environmentScore: 73.21, socialScore: 45.81, governanceScore: 56.06 },
    'MSFT': { totalESGScore: 64.8, environmentScore: 71.2, socialScore: 62.1, governanceScore: 61.1 },
    'AMZN': { totalESGScore: 52.3, environmentScore: 68.9, socialScore: 48.2, governanceScore: 39.8 },
    'GOOGL': { totalESGScore: 58.7, environmentScore: 69.4, socialScore: 52.3, governanceScore: 54.4 },
    'TSLA': { totalESGScore: 45.2, environmentScore: 62.1, socialScore: 41.8, governanceScore: 31.7 }
  };
  return esgData[symbol] || { totalESGScore: 55.0, environmentScore: 65.0, socialScore: 50.0, governanceScore: 50.0 };
};

export const processProductESG = async (req, res) => {
  const { shop, accessToken, productId } = req.body;
  if (!shop || !accessToken || !productId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const productResponse = await fetch(`https://${shop}/admin/api/2023-10/products/${productId}.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
    });

    if (!productResponse.ok) return res.status(400).json({ error: 'Product not found' });

    const productData = await productResponse.json();
    const product = productData.product;
    const vendorSymbol = getVendorSymbol(product.vendor);

    if (!vendorSymbol) {
      return res.status(400).json({ error: `No stock symbol found for vendor: ${product.vendor}` });
    }

    const esgData = getESGData(vendorSymbol);
    
    const esgScore = esgData.totalESGScore;
    const environmentScore = esgData.environmentScore;
    const socialScore = esgData.socialScore;
    const governanceScore = esgData.governanceScore;
    
    const riskLevel = calculateRiskLevel(esgScore);

    const { data, error } = await supabase.from('product_esg_scores').upsert({
      product_id: product.id.toString(),
      shop_domain: shop,
      product_title: product.title,
      vendor: product.vendor,
      vendor_symbol: vendorSymbol,
      esg_score: esgScore,
      environment_score: environmentScore,
      social_score: socialScore,
      governance_score: governanceScore,
      risk_level: riskLevel,
      last_updated: new Date().toISOString()
    });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save ESG data' });
    }

    res.status(200).json({
      success: true,
      productId: product.id,
      productTitle: product.title,
      vendor: product.vendor,
      vendorSymbol,
      esgScore,
      environmentScore,
      socialScore,
      governanceScore,
      riskLevel
    });
  } catch (error) {
    console.error('ESG processing error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getProductESGData = async (req, res) => {
  const { shop } = req.body;
  if (!shop) return res.status(400).json({ error: 'Missing shop domain' });

  try {
    const { data, error } = await supabase.from('product_esg_scores').select('*').eq('shop_domain', shop).order('last_updated', { ascending: false });
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch ESG data' });
    }
    res.status(200).json({ esgData: data || [] });
  } catch (error) {
    console.error('Error fetching ESG data:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getESGSummary = async (req, res) => {
  const { shop } = req.body;
  if (!shop) return res.status(400).json({ error: 'Missing shop domain' });

  try {
    const { data, error } = await supabase.from('product_esg_scores').select('*').eq('shop_domain', shop);
    if (error) return res.status(500).json({ error: 'Failed to fetch ESG data' });

    const products = data || [];
    const totalProducts = products.length;
    
    if (totalProducts === 0) {
      return res.status(200).json({
        totalProducts: 0, averageESGScore: 0, riskDistribution: { low: 0, medium: 0, high: 0 },
        averageScores: { environmental: 0, social: 0, governance: 0 }
      });
    }

    const averageESGScore = products.reduce((sum, p) => sum + (p.esg_score || 0), 0) / totalProducts;
    const averageEnvironmental = products.reduce((sum, p) => sum + (p.environment_score || 0), 0) / totalProducts;
    const averageSocial = products.reduce((sum, p) => sum + (p.social_score || 0), 0) / totalProducts;
    const averageGovernance = products.reduce((sum, p) => sum + (p.governance_score || 0), 0) / totalProducts;

    const riskDistribution = products.reduce((acc, p) => {
      acc[p.risk_level] = (acc[p.risk_level] || 0) + 1;
      return acc;
    }, { low: 0, medium: 0, high: 0 });

    res.status(200).json({
      totalProducts, averageESGScore: Math.round(averageESGScore * 10) / 10, riskDistribution,
      averageScores: {
        environmental: Math.round(averageEnvironmental * 10) / 10,
        social: Math.round(averageSocial * 10) / 10,
        governance: Math.round(averageGovernance * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error calculating ESG summary:', error);
    res.status(500).json({ error: error.message });
  }
};
