import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const getSupabaseClient = () => {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
};

export const getUserShops = async (req, res) => {
    try {
        const { userId } = req.user;
        const supabase = getSupabaseClient();
        
        const { data: shops, error } = await supabase
            .from('shops')
            .select('id, shopify_domain, created_at')
            .eq('user_id', userId);
            
        if (error) return res.status(500).json({ error: error.message });
        
        res.json({ shops });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const selectShop = async (req, res) => {
    try {
        const { userId } = req.user;
        const { shopId } = req.body;
        const supabase = getSupabaseClient();
        
        // Get shop details
        const { data: shop, error } = await supabase
            .from('shops')
            .select('shopify_domain')
            .eq('id', shopId)
            .eq('user_id', userId)
            .single();
            
        if (error || !shop) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        
        // Update user's current store_url
        await supabase
            .from('users')
            .update({ store_url: shop.shopify_domain })
            .eq('id', userId);
            
        res.json({ success: true, selectedShop: shop.shopify_domain });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};