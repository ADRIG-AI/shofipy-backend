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
                name
                status
                test
                currentPeriodEnd
                lineItems {
                    id
                    plan {
                        pricingDetails {
                            ... on AppRecurringPricing {
                                price {
                                    amount
                                    currencyCode
                                }
                                interval
                            }
                        }
                    }
                }
            }
        }
    }
`;

export const verifyBillingSetup = async (req, res) => {
    try {
        const { userId } = req.user;

        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                id, 
                plan_id, 
                subscription_status, 
                shopify_subscription_id,
                hasAccess,
                shops!inner(shopify_domain, shopify_access_token)
            `)
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const shop = user.shops;
        const checks = {
            shopConnection: !!shop?.shopify_domain && !!shop?.shopify_access_token,
            subscriptionExists: !!user.shopify_subscription_id,
            hasActivePlan: !!user.plan_id,
            hasAccess: user.hasAccess,
            subscriptionStatus: user.subscription_status
        };

        let shopifyVerification = null;
        if (checks.subscriptionExists && checks.shopConnection) {
            try {
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

                if (response.ok) {
                    const result = await response.json();
                    const subscription = result.data?.node;
                    
                    shopifyVerification = {
                        exists: !!subscription,
                        status: subscription?.status,
                        isTest: subscription?.test,
                        amount: subscription?.lineItems?.[0]?.plan?.pricingDetails?.price?.amount,
                        currency: subscription?.lineItems?.[0]?.plan?.pricingDetails?.price?.currencyCode,
                        interval: subscription?.lineItems?.[0]?.plan?.pricingDetails?.interval,
                        currentPeriodEnd: subscription?.currentPeriodEnd
                    };
                }
            } catch (error) {
                shopifyVerification = { error: error.message };
            }
        }

        res.json({
            userId,
            checks,
            shopifyVerification,
            recommendations: generateRecommendations(checks, shopifyVerification)
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
};

const generateRecommendations = (checks, shopifyVerification) => {
    const recommendations = [];

    if (!checks.shopConnection) {
        recommendations.push('Connect your Shopify store first');
    }

    if (!checks.subscriptionExists) {
        recommendations.push('Create a subscription plan');
    }

    if (shopifyVerification?.isTest && process.env.NODE_ENV === 'production') {
        recommendations.push('WARNING: Test subscription detected in production');
    }

    if (checks.subscriptionStatus === 'pending') {
        recommendations.push('Complete the subscription payment process');
    }

    if (checks.subscriptionStatus === 'cancelled') {
        recommendations.push('Reactivate your subscription');
    }

    if (!checks.hasAccess) {
        recommendations.push('Subscription access not granted - check payment status');
    }

    return recommendations;
};

export const testWebhookEndpoint = async (req, res) => {
    try {
        const testData = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            webhookSecret: !!process.env.SHOPIFY_WEBHOOK_SECRET,
            backendUrl: process.env.BACKEND_URL
        };

        res.json({
            message: 'Webhook endpoint is accessible',
            data: testData
        });
    } catch (error) {
        res.status(500).json({ error: 'Webhook test failed' });
    }
};