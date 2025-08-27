import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const getSupabaseClient = () => {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
};

export const getUser = async (req, res) => {
    try {
        const { email } = req.user;
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase
            .from('users')
            .select('priceId, hasAccess')
            .eq('email', email)
            .single();
            
        if (error) return res.status(404).json({ error: 'User not found' });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
