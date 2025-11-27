import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export const getUserShop = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get shop information for the authenticated user
    const { data: shopData, error } = await supabase
      .from('shops')
      .select('shopify_domain, shopify_access_token')
      .eq('user_id', userId)
      .single();

    if (error || !shopData) {
      return res.status(404).json({ error: 'No shop found for user' });
    }

    res.status(200).json({
      shop: shopData.shopify_domain,
      hasAccessToken: !!shopData.shopify_access_token
    });
  } catch (error) {
    console.error('Error fetching user shop:', error);
    res.status(500).json({ error: 'Failed to fetch shop information' });
  }
};