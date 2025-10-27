const graphqlRequest = async (shop, accessToken, query, variables = {}) => {
  console.log('GraphQL Request:', {
    shop,
    url: `https://${shop}/admin/api/2025-07/graphql.json`,
    query: query.substring(0, 200) + '...',
    variables
  });

  const response = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  console.log('GraphQL Response Status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GraphQL Response Error:', errorText);
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log('GraphQL Response:', JSON.stringify(result, null, 2));
  
  if (result.errors) {
    console.error('GraphQL Errors:', result.errors);
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
};

// Get all orders
export async function getAllOrders(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { shop, accessToken } = req.body || {};
  console.log('getAllOrders request:', { shop, hasAccessToken: !!accessToken });
  
  if (!shop || !accessToken) {
    return res.status(400).json({ error: 'Missing shop or access token' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Filtering orders before:', today);
    
    const query = `
      query {
        orders(first: 250, query: "created_at:<${today}") {
          edges {
            node {
              id
              name
              email
              createdAt
              updatedAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              subtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalTaxSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              displayFulfillmentStatus
              displayFinancialStatus
              customer {
                id
                firstName
                lastName
                email
              }
              shippingAddress {
                firstName
                lastName
                address1
                address2
                city
                province
                country
                zip
              }
              billingAddress {
                firstName
                lastName
                address1
                address2
                city
                province
                country
                zip
              }
            }
          }
        }
      }
    `;

    const data = await graphqlRequest(shop, accessToken, query, {});
    const orders = data?.orders?.edges?.map(edge => edge.node) || [];
    
    return res.status(200).json({
      orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('Error fetching orders:', {
      message: error.message,
      stack: error.stack,
      shop,
      hasAccessToken: !!accessToken
    });
    
    if (error.message.includes('Access denied') || error.message.includes('access_denied')) {
      return res.status(200).json({
        orders: [],
        count: 0,
        error: 'Permission denied',
        message: 'App needs read_orders scope'
      });
    }
    
    return res.status(500).json({
      error: error.message || 'Failed to fetch orders',
      details: error.stack
    });
  }
}

// Get single order by ID
export async function getOrderById(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, orderId } = req.body || {};
  if (!shop || !accessToken || !orderId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const gid = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
    
    const query = `
      query order($id: ID!) {
        order(id: $id) {
          id
          name
          email
          createdAt
          updatedAt
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFulfillmentStatus
          displayFinancialStatus
          customer {
            id
            firstName
            lastName
            email
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                product {
                  id
                  title
                }
                variant {
                  id
                  title
                }
              }
            }
          }
          shippingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
          }
          billingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
          }
        }
      }
    `;

    const data = await graphqlRequest(shop, accessToken, query, { id: gid });
    return res.status(200).json(data.order);
  } catch (error) {
    console.error(error);
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'App lacks required permissions to access orders'
      });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to fetch order' });
  }
}

// Update order
export async function updateOrder(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, orderId, orderData } = req.body || {};
  if (!shop || !accessToken || !orderId || !orderData) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const gid = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
    
    const mutation = `
      mutation orderUpdate($id: ID!, $order: OrderInput!) {
        orderUpdate(id: $id, order: $order) {
          order {
            id
            name
            email
            updatedAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await graphqlRequest(shop, accessToken, mutation, { 
      id: gid, 
      order: orderData 
    });

    if (data.orderUpdate.userErrors && data.orderUpdate.userErrors.length > 0) {
      return res.status(400).json({
        error: 'Update failed',
        details: data.orderUpdate.userErrors
      });
    }

    return res.status(200).json(data.orderUpdate.order);
  } catch (error) {
    console.error(error);
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'App lacks required permissions to modify orders'
      });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to update order' });
  }
}

export async function getOrderDetails(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, orderId } = req.body || {};
  if (!shop || !accessToken || !orderId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const gid = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
    
    const orderQuery = `
      query order($id: ID!) {
        order(id: $id) {
          id
          name
          email
          createdAt
          updatedAt
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFulfillmentStatus
          displayFinancialStatus
          customer {
            id
            firstName
            lastName
            email
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                product {
                  id
                  title
                }
                variant {
                  id
                  title
                }
              }
            }
          }
          shippingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
          }
          billingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
          }
        }
      }
    `;

    const data = await graphqlRequest(shop, accessToken, orderQuery, { id: gid });
    return res.status(200).json(data.order);
  } catch (error) {
    console.error(error);
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'App lacks required permissions to access orders'
      });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to fetch order details' });
  }
}