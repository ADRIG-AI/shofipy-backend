import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const CREATE_SUBSCRIPTION_MUTATION = `
    mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, lineItems: $lineItems) {
            userErrors {
                field
                message
            }
            confirmationUrl
            appSubscription {
                id
            }
        }
    }
`;

const BILLING_PLANS = {
    starter: {
        name: 'Starter Plan',
        price: 1.00,
        interval: 'EVERY_30_DAYS',
        subuserLimit: 1
    },
    professional: {
        name: 'Professional Plan', 
        price: 25.00,
        interval: 'EVERY_30_DAYS',
        subuserLimit: 5
    },
    enterprise: {
        name: 'Enterprise Plan',
        price: 299.00,
        interval: 'EVERY_30_DAYS', 
        subuserLimit: 999
    }
};

export const createSubscription = async (req, res) => {
    try {
        const { planId, billingCycle = 'monthly' } = req.body;
        const { userId } = req.user;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!planId || !BILLING_PLANS[planId]) {
            return res.status(400).json({ error: 'Invalid plan ID' });
        }

        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('shopify_domain, shopify_access_token')
            .eq('user_id', userId)
            .single();

        if (shopError || !shop) {
            return res.status(400).json({ error: 'Shopify store not connected. Please connect your Shopify store first.' });
        }

        if (!shop.shopify_access_token || !shop.shopify_domain) {
            return res.status(400).json({ error: 'Shopify store credentials incomplete. Please reconnect your store.' });
        }

        const plan = BILLING_PLANS[planId];
        const returnUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}api/shopify/billing/callback`;

        const variables = {
            name: plan.name,
            returnUrl,
            test: process.env.NODE_ENV !== 'production',
            lineItems: [{
                plan: {
                    appRecurringPricingDetails: {
                        price: {
                            amount: plan.price,
                            currencyCode: 'USD'
                        },
                        interval: plan.interval
                    }
                }
            }]
        };

        const response = await fetch(`https://${shop.shopify_domain}/admin/api/2025-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': shop.shopify_access_token,
            },
            body: JSON.stringify({ query: CREATE_SUBSCRIPTION_MUTATION, variables }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Shopify API error:', response.status, errorText);
            throw new Error(`Shopify API request failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
        }

        if (result.data?.appSubscriptionCreate?.userErrors?.length > 0) {
            console.error('Shopify subscription errors:', result.data.appSubscriptionCreate.userErrors);
            return res.status(400).json({ 
                error: `Subscription creation failed: ${result.data.appSubscriptionCreate.userErrors.map(e => e.message).join(', ')}`,
                details: result.data.appSubscriptionCreate.userErrors
            });
        }

        const subscription = result.data?.appSubscriptionCreate;
        
        if (!subscription?.confirmationUrl) {
            return res.status(400).json({ error: 'No confirmation URL received' });
        }
        
        // Get priceId from frontend plans mapping
        const priceIdMap = {
            starter: { monthly: 'price_1RcnoUQiUhrwJo9CamPZGsh1', yearly: 'price_1RcnosQiUhrwJo9CzIMCgiea' },
            professional: { monthly: 'price_1RcnpzQiUhrwJo9CVz7Wsug6', yearly: 'price_1RcnqKQiUhrwJo9CCdhvD8Ep' },
            enterprise: { monthly: 'price_1QZ002FZ0000000000000000', yearly: 'price_1QZ002FZ0000000000000000' }
        };
        const priceId = priceIdMap[planId]?.[billingCycle];

        // Store subscription details immediately
        const { error: updateError } = await supabase
            .from('users')
            .update({
                shopify_subscription_id: subscription.appSubscription.id,
                plan_id: planId,
                priceId: priceId,
                subuser_limit: plan.subuserLimit,
                subscription_status: 'pending',
                hasAccess: false
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Failed to update user subscription:', updateError);
            return res.status(500).json({ error: 'Failed to store subscription details' });
        }

        console.log('Stored subscription for user:', userId, 'subscription:', subscription.appSubscription.id);

        res.json({ 
            confirmationUrl: subscription.confirmationUrl,
            subscriptionId: subscription.appSubscription.id
        });

    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
};

export const getSubscriptionStatus = async (req, res) => {
    try {
        const { userId } = req.user;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('plan_id, subscription_status, hasAccess')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            hasSubscription: !!user.plan_id,
            planId: user.plan_id,
            status: user.subscription_status,
            hasAccess: user.hasAccess
        });

    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const { userId } = req.user;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({
                subscription_status: 'cancelled',
                hasAccess: false
            })
            .eq('id', userId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to cancel subscription' });
        }

        res.json({ success: true, message: 'Subscription cancelled successfully' });

    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
};

export const activateSubscription = async (req, res) => {
    try {
        const { userId } = req.user;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({
                subscription_status: 'active',
                hasAccess: true
            })
            .eq('id', userId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to activate subscription' });
        }

        res.json({ success: true, message: 'Subscription activated successfully' });

    } catch (error) {
        console.error('Activate subscription error:', error);
        res.status(500).json({ error: 'Failed to activate subscription' });
    }
};