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
