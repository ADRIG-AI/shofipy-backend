// controllers/shopify/PackingListController.js
import { createClient } from '@supabase/supabase-js';
import { uploadToS3 } from '../../utils/s3Upload.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function savePackingList(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { 
    shop, 
    accessToken, 
    orderId, 
    orderData, 
    pdfBuffer, 
    fileName,
    netWeight,
    grossWeight
  } = req.body || {};

  if (!shop || !accessToken || !orderId || !pdfBuffer || !fileName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Convert array back to buffer
    const buffer = Buffer.from(pdfBuffer);
    
    // Upload to S3
    const packingListUrl = await uploadToS3(buffer, fileName, 'packing-lists');
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('order_packing_lists')
      .insert({
        order_id: orderId,
        shop_domain: shop,
        order_number: orderData.order_number || orderId,
        customer_name: orderData.customer ? 
          `${orderData.customer.first_name || ''} ${orderData.customer.last_name || ''}`.trim() : 
          'Unknown',
        net_weight: netWeight,
        gross_weight: grossWeight,
        packing_list_url: packingListUrl,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      packingListUrl,
      packingListData: data[0]
    });
  } catch (error) {
    console.error('Error saving packing list:', error);
    return res.status(500).json({ error: error.message || 'Failed to save packing list' });
  }
}
