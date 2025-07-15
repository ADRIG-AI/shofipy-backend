// Get all orders
export async function getAllOrders(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  
    const { shop, accessToken, limit = 50 } = req.body || {};
    if (!shop || !accessToken) {
      return res.status(400).json({ error: 'Missing shop or access token' });
    }
  
    try {
      const url = `https://${shop}/admin/api/2025-07/orders.json?status=any&limit=${limit}`;
  
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify API Error:', response.status, errorText);
        
        // Return empty orders for permission errors instead of throwing
        if (response.status === 403) {
          return res.status(200).json({
            orders: [],
            count: 0,
            error: 'Permission denied',
            message: 'App needs read_orders scope and protected customer data approval'
          });
        }
        
        return res.status(response.status).json({
          error: `Shopify API Error: ${response.status}`,
          message: errorText
        });
      }
  
      const data = await response.json();
      return res.status(200).json({
        orders: data.orders || [],
        count: data.orders?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({
        error: error.message || 'Failed to fetch orders'
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
      const url = `https://${shop}/admin/api/2025-07/orders/${orderId}.json`;
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify API Error:', errorText);
        
        if (response.status === 403) {
          return res.status(403).json({
            error: 'App lacks required permissions to access orders'
          });
        }
        
        return res.status(response.status).json({
          error: `Failed to fetch order: ${response.status}`
        });
      }
  
      const data = await response.json();
      return res.status(200).json(data.order);
    } catch (error) {
      console.error(error);
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
      const url = `https://${shop}/admin/api/2025-07/orders/${orderId}.json`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: orderData }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify API Error:', errorText);
        
        if (response.status === 403) {
          return res.status(403).json({
            error: 'App lacks required permissions to modify orders'
          });
        }
        
        return res.status(response.status).json({
          error: `Failed to update order: ${response.status}`
        });
      }
  
      const data = await response.json();
      return res.status(200).json(data.order);
    } catch (error) {
      console.error(error);
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
    console.log(`Fetching order details for ID: ${orderId}`);
    
    // Get detailed order data with specific fields including line_items
    const orderUrl = `https://${shop}/admin/api/2025-07/orders/${orderId}.json?fields=id,order_number,line_items,name,total_price,subtotal_price,total_tax,customer,billing_address,shipping_address,created_at`;
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Shopify API Error:', errorText);
      
      if (orderResponse.status === 403) {
        return res.status(403).json({
          error: 'App lacks required permissions to access order details'
        });
      }
      
      return res.status(orderResponse.status).json({
        error: `Failed to fetch order details: ${orderResponse.status}`,
        message: errorText
      });
    }

    const orderData = await orderResponse.json();
    console.log('Order data fetched:', JSON.stringify(orderData, null, 2));
    
    // Get shop info for logo and address
    const shopUrl = `https://${shop}/admin/api/2025-07/shop.json?fields=name,address1,city,province,zip,country,logo`;
    
    const shopResponse = await fetch(shopUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    let shopData = {};
    if (shopResponse.ok) {
      const shopResult = await shopResponse.json();
      shopData = shopResult.shop;
      console.log('Shop data fetched:', JSON.stringify(shopData, null, 2));
    }

    return res.status(200).json({
      order: orderData.order,
      shop: shopData
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Failed to fetch order details' });
  }
}
