import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function saveLandedCostCalculation(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  
    const { 
      productValue, 
      quantity, 
      shippingCost, 
      insurance, 
      destinationCountry, 
      hsCode, 
      currency,
      results 
    } = req.body || {};
  
    if (!results) {
      return res.status(400).json({ error: 'Missing results' });
    }
  
    try {
      const { data, error } = await supabase
        .from('landed_cost_calculations')
        .insert({
          product_value: parseFloat(productValue) || 0,
          quantity: parseInt(quantity) || 0,
          shipping_cost: parseFloat(shippingCost) || 0,
          insurance: parseFloat(insurance) || 0,
          destination_country: destinationCountry || '',
          hs_code: hsCode || '',
          currency: currency || 'USD',
          subtotal: results.subtotal,
          duty_rate: results.dutyRate,
          duty_amount: results.dutyAmount,
          vat_rate: results.vatRate,
          vat_amount: results.vatAmount,
          total_landed_cost: results.totalLandedCost,
          margin: results.margin
        })
        .select();
  
      if (error) throw error;
  
      return res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('Error saving landed cost calculation:', err);
      return res.status(500).json({ error: err.message || 'Failed to save calculation' });
    }
  }
  
export async function getLandedCostHistory(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { data, error } = await supabase
      .from('landed_cost_calculations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return res.status(200).json({ calculations: data });
  } catch (err) {
    console.error('Error fetching landed cost history:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
}


export async function getLandedCostStats(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  
    try {
      // Today's calculations
      const { data: todayData, error: todayError } = await supabase
        .from('landed_cost_calculations')
        .select('id')
        .gte('created_at', new Date().toISOString().split('T')[0]);
  
      // Average duty rate
      const { data: dutyData, error: dutyError } = await supabase
        .from('landed_cost_calculations')
        .select('duty_rate');
  
      // Average margin
      const { data: marginData, error: marginError } = await supabase
        .from('landed_cost_calculations')
        .select('margin');
  
      if (todayError || dutyError || marginError) {
        throw new Error('Database query failed');
      }
  
      const avgDutyRate = dutyData.length > 0 
        ? dutyData.reduce((sum, item) => sum + item.duty_rate, 0) / dutyData.length 
        : 0;
  
      const avgMargin = marginData.length > 0 
        ? marginData.reduce((sum, item) => sum + item.margin, 0) / marginData.length 
        : 0;
  
      return res.status(200).json({
        calculationsToday: todayData.length,
        avgDutyRate: avgDutyRate.toFixed(1),
        avgMargin: avgMargin.toFixed(1)
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch stats' });
    }
  }
  