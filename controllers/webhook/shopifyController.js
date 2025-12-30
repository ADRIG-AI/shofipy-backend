import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const verifyShopifyWebhook = (data, hmacHeader) => {
    if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
        console.warn('SHOPIFY_WEBHOOK_SECRET not set - webhook verification disabled');
        return process.env.NODE_ENV === 'development';
    }
    
    const calculated_hmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(data, 'utf8')
        .digest('base64');
    
    return crypto.timingSafeEqual(
        Buffer.from(calculated_hmac, 'base64'),
        Buffer.from(hmacHeader, 'base64')
    );
};

export const handleSubscriptionUpdate = async (req, res) => {
    try {
        const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
        const body = JSON.stringify(req.body);
        
        if (!verifyShopifyWebhook(body, hmacHeader)) {
            return res.status(401).json({ error: 'Unauthorized webhook' });
        }

        const subscription = req.body;
        const subscriptionId = subscription.id;
        const status = subscription.status;

        // Update user subscription status
        const { error } = await supabase
            .from('users')
            .update({
                subscription_status: status,
                hasAccess: status === 'active'
            })
            .eq('shopify_subscription_id', subscriptionId);

        if (error) {
            console.error('Failed to update subscription:', error);
            return res.status(500).json({ error: 'Database update failed' });
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

export const handleSubscriptionCallback = async (req, res) => {
    try {
        const { charge_id, subscription_id } = req.query;
        const subscriptionIdToUse = subscription_id || charge_id;
        
        console.log('Callback received:', { charge_id, subscription_id, subscriptionIdToUse });
        
        if (!subscriptionIdToUse) {
            console.error('No subscription ID provided in callback');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/billing?error=missing_subscription_id`);
        }

        // Find user by subscription ID with multiple lookup strategies
        let user, findError;
        
        // Strategy 1: Exact match
        const { data: userData1, error: error1 } = await supabase
            .from('users')
            .select('id, plan_id, subscription_status')
            .eq('shopify_subscription_id', subscriptionIdToUse)
            .single();
            
        if (userData1) {
            user = userData1;
        } else {
            // Strategy 2: Match by GID format (gid://shopify/AppSubscription/ID)
            const { data: userData2, error: error2 } = await supabase
                .from('users')
                .select('id, plan_id, subscription_status, shopify_subscription_id')
                .like('shopify_subscription_id', `%${subscriptionIdToUse}%`)
                .single();
                
            if (userData2) {
                user = userData2;
            } else {
                // Strategy 3: Extract ID from GID and match
                const idMatch = subscriptionIdToUse.match(/\d+$/);
                if (idMatch) {
                    const { data: userData3, error: error3 } = await supabase
                        .from('users')
                        .select('id, plan_id, subscription_status, shopify_subscription_id')
                        .like('shopify_subscription_id', `%${idMatch[0]}%`)
                        .single();
                    user = userData3;
                    findError = error3;
                } else {
                    findError = error2;
                }
            }
        }

        if (findError || !user) {
            console.error('User not found for subscription:', subscriptionIdToUse, findError);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/billing?error=user_not_found`);
        }

        console.log('Found user for subscription:', user.id, 'current status:', user.subscription_status);

        // Mark subscription as active
        const updateData = {
            subscription_status: 'active',
            hasAccess: true
        };
        
        const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id);

        if (updateError) {
            console.error('Failed to activate subscription:', updateError);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/billing?error=activation_failed`);
        }

        console.log('Subscription activated successfully for user:', user.id);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/billing?success=true&plan=${user.plan_id}`);
    } catch (error) {
        console.error('Callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/billing?error=callback_failed`);
    }
};