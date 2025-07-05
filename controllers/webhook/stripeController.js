import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const webhookController = async (req, res) => {
    // For webhook requests, we need raw body data
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const rawBody = req.body;

    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const data = event.data.object;

    console.log(`✅ Handling event type: ${event.type}`);

    switch (event.type) {
        case 'checkout.session.completed': {
            console.log('✅ Processing checkout.session.completed');

            if (!data.customer) {
                console.log('⚠️  No customer ID in checkout.session.completed — skipping.');
                break;
            }

            let customer;
            try {
                customer = await stripe.customers.retrieve(data.customer);
            } catch (err) {
                console.log(`❌ Failed to retrieve customer: ${err.message}`);
                break;
            }
            console.log(data.line_items?.data[0]?.price?.id);
            console.log(data);
            const { error } = await supabase
                .from('users')
                .update({
                    priceId: data.line_items?.data[0]?.price?.id || null,
                    hasAccess: true,
                    customerId: data.customer,
                    sessionId: data.id,
                })
                .eq('email', customer.email);

            if (error) {
                console.log('❌ Supabase update error:', error);
                return res.status(500).send(error);
            }
            break;
        }

        case 'invoice.payment_succeeded': {
            if (!data.customer) {
                console.log('⚠️  No customer ID in invoice.payment_succeeded — skipping.');
                break;
            }

            const { error } = await supabase
                .from('users')
                .update({ hasAccess: true })
                .eq('customerId', data.customer);

            if (error) {
                console.log('❌ Supabase update error:', error);
                return res.status(500).send(error);
            }
            break;
        }

        case 'invoice.payment_failed': {
            if (!data.customer) {
                console.log('⚠️  No customer ID in invoice.payment_failed — skipping.');
                break;
            }

            const { error } = await supabase
                .from('users')
                .update({ hasAccess: false })
                .eq('customerId', data.customer);

            if (error) {
                console.log('❌ Supabase update error:', error);
                return res.status(500).send(error);
            }
            break;
        }

        case 'customer.subscription.deleted':
        case 'customer.subscription.updated': {
            const subscriptionId = data.id;
            let subscription;
            try {
                subscription = await stripe.subscriptions.retrieve(subscriptionId);
            } catch (err) {
                console.log(`❌ Failed to retrieve subscription: ${err.message}`);
                break;
            }

            const { error } = await supabase
                .from('users')
                .update({
                    hasAccess: subscription.status === 'active',
                    priceId: subscription.items.data[0]?.price?.id || null,
                })
                .eq('customerId', subscription.customer);

            if (error) {
                console.log('❌ Supabase update error:', error);
                return res.status(500).send(error);
            }
            break;
        }

        default:
            console.log(`⚠️  Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
};
