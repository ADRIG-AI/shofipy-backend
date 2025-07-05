import 'dotenv/config';

export const exchangeCodeForToken = async (code, shop, apiKey, apiSecret) => {
    const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenPayload = {
        client_id: apiKey,
        client_secret: apiSecret,
        code,
    };

    const response = await fetch(accessTokenRequestUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(accessTokenPayload),
    });

    if (!response.ok) {
        throw new Error('Failed to exchange code for access token');
    }

    return response.json();
};
