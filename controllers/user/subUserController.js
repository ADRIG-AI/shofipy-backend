import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const getSupabaseClient = () => {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
};

export const createSubUser = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('User from token:', req.user);
        
        const { name, email, password, role } = req.body;
        const { userId: ownerId } = req.user;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!ownerId) {
            return res.status(400).json({ error: 'Owner ID not found in token' });
        }

        const supabase = getSupabaseClient();
        
        // Get owner's price ID to determine subuser limit
        const { data: owner, error: ownerError } = await supabase
            .from('users')
            .select('priceId')
            .eq('id', ownerId)
            .single();

        if (ownerError) {
            console.log('Owner error:', ownerError);
            return res.status(400).json({ error: 'Owner not found' });
        }

        // Calculate subuser limit based on price ID
        let subuserLimit = 1; // Default for free plan
        const priceId = owner?.priceId;
        
        if (priceId === 'price_1RcnoUQiUhrwJo9CamPZGsh1' || priceId === 'price_1RcnosQiUhrwJo9CzIMCgiea') {
            subuserLimit = 1; // Starter
        } else if (priceId === 'price_1RcnpzQiUhrwJo9CVz7Wsug6' || priceId === 'price_1RcnqKQiUhrwJo9CCdhvD8Ep') {
            subuserLimit = 5; // Professional
        } else if (priceId) {
            subuserLimit = 999; // Enterprise
        }

        // Check subuser limit
        const { count } = await supabase
            .from('sub_users')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', ownerId);

        if (count >= subuserLimit) {
            return res.status(400).json({ error: 'Subuser limit reached' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create sub-user
        const { data, error } = await supabase
            .from('sub_users')
            .insert([{
                owner_id: ownerId,
                name,
                email,
                password_hash: hashedPassword,
                role
            }])
            .select()
            .single();

        if (error) {
            console.log('Insert error:', error);
            throw error;
        }

        res.json({ success: true, user: { id: data.id, name: data.name, email: data.email, role: data.role } });
    } catch (error) {
        console.log('Full error:', error);
        res.status(500).json({ error: error.message });
    }
};



export const getSubUsers = async (req, res) => {
    try {
        const { userId: ownerId } = req.user;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('sub_users')
            .select('id, name, email, role, created_at')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteSubUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId: ownerId } = req.user;
        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('sub_users')
            .delete()
            .eq('id', id)
            .eq('owner_id', ownerId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
