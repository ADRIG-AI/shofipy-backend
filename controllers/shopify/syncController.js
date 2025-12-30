import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const GET_SUBSCRIPTION_QUERY = `
    query getAppSubscription($id: ID!) {
        node(id: $id) {
            ... on AppSubscription {
                id
                status
                test
                currentPeriodEnd
            }
        }
    }
`;

export const syncSubscriptionStatus = async (req, res) => {
    try {
        const { userId } = req.user;

        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                shopify_subscription_id,
                subscription_status,
                shops!inner(shopify_domain, shopify_access_token)
            `)
            .eq('id', userId)
            .single();

        if (userError || !user || !user.shopify_subscription_id) {
            return res.status(400).json({ error: 'No subscription found' });
        }

        const shop = user.shops;
        
        const response = await fetch(`https://${shop.shopify_domain}/admin/api/2025-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': shop.shopify_access_token,
            },
            body: JSON.stringify({
                query: GET_SUBSCRIPTION_QUERY,
                variables: { id: user.shopify_subscription_id }
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subscription from Shopify');
        }

        const result = await response.json();
        const subscription = result.data?.node;

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found in Shopify' });
        }

        // Update local status to match Shopify
        const { error: updateError } = await supabase
            .from('users')
            .update({
                subscription_status: subscription.status.toLowerCase(),
                hasAccess: subscription.status === 'ACTIVE'
            })
            .eq('id', userId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to sync subscription status' });
        }

        res.json({
            synced: true,
            shopifyStatus: subscription.status,
            localStatus: subscription.status.toLowerCase(),
            hasAccess: subscription.status === 'ACTIVE'
        });

    } catch (error) {
        console.error('Sync subscription error:', error);
        res.status(500).json({ error: 'Failed to sync subscription status' });
    }
};