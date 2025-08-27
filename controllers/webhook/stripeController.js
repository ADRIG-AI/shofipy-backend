import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});

const getSupabaseClient = () => {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
};

export const webhookController = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const data = event.data.object;
    const supabase = getSupabaseClient();

    switch (event.type) {
        case 'checkout.session.completed': {
            if (!data.customer) break;
            
            const customer = await stripe.customers.retrieve(data.customer);
            
            await supabase
                .from('users')
                .update({
                    priceId: data.line_items?.data[0]?.price?.id,
                    hasAccess: true,
                    customerId: data.customer,
                })
                .eq('email', customer.email);
            break;
        }
        
        case 'invoice.payment_succeeded': {
            if (!data.customer) break;
            
            await supabase
                .from('users')
                .update({ hasAccess: true })
                .eq('customerId', data.customer);
            break;
        }
        
        case 'invoice.payment_failed': {
            if (!data.customer) break;
            
            await supabase
                .from('users')
                .update({ hasAccess: false })
                .eq('customerId', data.customer);
            break;
        }
    }

    res.status(200).json({ received: true });
};
