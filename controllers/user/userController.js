import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY // Use service role for server-side inserts
);

export const getUser = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Missing email' });
        
        console.log(email);
        const { data, error } = await supabase
            .from('users')
            .select('priceId')
            .eq('email', email);
            
        if (!data || data.length === 0) return res.status(404).json({ error: 'No user found' });

        // Return just the first one
        res.status(200).json(data[0]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
};
