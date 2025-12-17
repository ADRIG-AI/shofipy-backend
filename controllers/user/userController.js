import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const getSupabaseClient = () => {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
};
export const getUser = async (req, res) => {
    try {
        const { userId, type } = req.user;
        const supabase = getSupabaseClient();
        
        let data;
        
        if (type === 'admin') {
            const { data: userData, error } = await supabase
                .from('users')
                .select('"priceId", "hasAccess", plan_id, subscription_status')
                .eq('id', userId)
                .single();
                
            if (error) return res.status(404).json({ error: 'User not found' });
            data = userData;
        } else if (type === 'sub_user') {
            const { data: subUserData, error: subError } = await supabase
                .from('sub_users')
                .select('owner_id')
                .eq('id', userId)
                .single();
                
            if (subError) return res.status(404).json({ error: 'Sub-user not found' });
            
            const { data: ownerData, error: ownerError } = await supabase
                .from('users')
                .select('"priceId", "hasAccess", plan_id, subscription_status')
                .eq('id', subUserData.owner_id)
                .single();
                
            if (ownerError) return res.status(404).json({ error: 'Owner not found' });
            data = ownerData;
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const initiateShopifyAuth = async (req, res) => {
    try {
        const { shop } = req.body;
        
        if (!shop || !shop.includes('.myshopify.com')) {
            return res.status(400).json({ error: 'Invalid shop domain' });
        }
        
        const scopes = 'read_customers,read_files,read_order_edits,read_orders,read_products,write_customers,write_files,write_order_edits,write_orders,write_products';
        const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
        const state = req.user.userId;
        
        const authUrl = `https://${shop}/admin/oauth/authorize?` +
            `client_id=${process.env.SHOPIFY_API_KEY}&` +
            `scope=${scopes}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}`;
        
        res.json({ authUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const handleShopifyCallback = async (req, res) => {
    try {
        const { code, state: userId, shop } = req.query;
        
        if (!code || !shop) {
            return res.status(400).json({ error: 'Authorization denied or missing shop' });
        }
        
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
            throw new Error('Failed to exchange code for token');
        }
        
        const { access_token } = await tokenResponse.json();
        
        const supabase = getSupabaseClient();
        
        // Store in shops table
        await supabase
            .from('shops')
            .upsert({
                user_id: userId,
                shopify_domain: shop,
                shopify_access_token: access_token
            }, {
                onConflict: 'user_id,shopify_domain'
            });
            
        // Update user with store_url
        await supabase
            .from('users')
            .update({ store_url: shop })
            .eq('id', userId);
        
        res.json({ success: true, message: 'Shopify connected successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};