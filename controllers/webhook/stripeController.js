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
            
            try {
                const session = await stripe.checkout.sessions.retrieve(data.id, {
                    expand: ['line_items']
                });
                
                const customer = await stripe.customers.retrieve(data.customer);
                const priceId = session.line_items?.data[0]?.price?.id;
                
                let subuserLimit = 1;
                if (priceId === 'price_1RcnoUQiUhrwJo9CamPZGsh1' || priceId === 'price_1RcnosQiUhrwJo9CzIMCgiea') {
                    subuserLimit = 1;
                } else if (priceId === 'price_1RcnpzQiUhrwJo9CVz7Wsug6' || priceId === 'price_1RcnqKQiUhrwJo9CCdhvD8Ep') {
                    subuserLimit = 5;
                } else {
                    subuserLimit = 999;
                }
                
                const { error } = await supabase
                    .from('users')
                    .update({
                        priceId: priceId,
                        hasAccess: true,
                        customerId: data.customer,
                        subuser_limit: subuserLimit,
                    })
                    .eq('email', customer.email);
                    
                if (error) {
                    console.error('Supabase update error:', error);
                }
            } catch (error) {
                console.error('Webhook processing error:', error);
            }
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
