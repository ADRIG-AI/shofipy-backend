export const getShopInfo = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { shop, accessToken } = req.body;
    if (!shop || !accessToken) {
        return res.status(400).json({ error: 'Missing shop or access token' });
    }

    try {
        const response = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Failed to fetch shop data from Shopify:', errorData);
            throw new Error('Failed to fetch shop data from Shopify');
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch shop data' });
    }
};
