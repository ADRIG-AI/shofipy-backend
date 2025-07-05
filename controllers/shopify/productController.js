export const getProducts = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { shop, accessToken } = req.body;
    if (!shop || !accessToken) {
        return res.status(400).json({ error: 'Missing shop or access token' });
    }

    try {
        const response = await fetch(`https://${shop}/admin/api/2023-10/products.json?limit=5`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Failed to fetch products from Shopify:', errorData);
            throw new Error('Failed to fetch products from Shopify');
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch products' });
    }
};


export default async function getAllProducts(req, res) {
    
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  
    
    const { shop, accessToken } = req.body || {};
    if (!shop || !accessToken) {
      return res.status(400).json({ error: 'Missing shop or access token' });
    }
  
    try {
      const limit = 250;   
      let sinceId = null;  
      const allProducts = [];
  
      while (true) {
        let url = `https://${shop}/admin/api/2025-07/products.json?limit=${limit}`;
        if (sinceId) url += `&since_id=${sinceId}`;
  
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          const errorData = await response.text();
          console.error('Failed to fetch products from Shopify:', errorData);
          throw new Error('Failed to fetch products from Shopify');
        }
  
        const { products = [] } = await response.json();
  
        if (products.length === 0) break;
        allProducts.push(...products);
        sinceId = products[products.length - 1].id; 
  
        if (products.length < limit) break;       
      }
  
      // 4. Success
      return res.status(200).json({
        products: allProducts,
        count: allProducts.length,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: error.message || 'Failed to fetch products',
      });
    }
  }
  


export async function getProductID(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  
    const { shop, accessToken, productId } = req.body || {};
    if (!shop || !accessToken || !productId) {
      return res
        .status(400)
        .json({ error: "Missing required parameters (shop, accessToken, productId)" });
    }
  
    try {
      const apiVersion = "2025-07"; // match your other routes
      const url = `https://${shop}/admin/api/${apiVersion}/products/${productId}.json`;
  
      const response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        const text = await response.text();
        console.error("Shopify error:", text);
        return res
          .status(500)
          .json({ error: "Failed to fetch product from Shopify" });
      }
  
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: err.message || "Unexpected server error" });
    }
  }
  




export async function updateProductID(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  

    const { shop, accessToken, productId, productData } = req.body || {};
    if (!shop || !accessToken || !productId || !productData) {
      return res
        .status(400)
        .json({ error: "Missing required parameters" });
    }
  
    try {

      const apiVersion = "2025-07";
      const base = `https://${shop}/admin/api/${apiVersion}/products/${productId}.json`;
  
      const getResp = await fetch(base, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });
  
      if (!getResp.ok) {
        const detail = await getResp.text();
        return res
          .status(500)
          .json({ error: "Failed to fetch current product", detail });
      }
  
      const currentProduct = await getResp.json();
      const variantId = currentProduct.product.variants?.[0]?.id;
  
      
      const updatePayload = {
        product: {
          title: productData.title,
          body_html: productData.body_html,
          vendor: productData.vendor,
          product_type: productData.product_type,
          variants: [
            {
              id: variantId,
              price: productData.price,
              sku: productData.sku,
              inventory_quantity: productData.inventory_quantity,
            },
          ],
        },
      };
  
      /* 3️⃣  PUT update to Shopify */
      const putResp = await fetch(base, {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });
  
      if (!putResp.ok) {
        const detail = await putResp.text();
        return res
          .status(500)
          .json({ error: "Failed to update product", detail });
      }
  
      const updated = await putResp.json();
      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: err.message || "Unexpected server error" });
    }
  }
  

  

export async function createProduct(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  

    const { shop, accessToken, productData } = req.body || {};
    if (!shop || !accessToken || !productData) {
      return res
        .status(400)
        .json({ error: "Missing required parameters" });
    }
  
    const apiVersion = "2025-07";
    const createPayload = {
      product: {
        title: productData.title,
        body_html: productData.body_html,
        vendor: productData.vendor,
        product_type: productData.product_type,
        variants: [
          {
            price: productData.price,
            sku: productData.sku,
            inventory_quantity: productData.inventory_quantity,
          },
        ],
      },
    };
  
    try {
      const resp = await fetch(
        `https://${shop}/admin/api/${apiVersion}/products.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createPayload),
        }
      );
  
      if (!resp.ok) {
        const detail = await resp.text();
        console.error("Shopify API Error:", detail);
        return res
          .status(500)
          .json({ error: "Failed to create product", detail });
      }
  
      const data = await resp.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: err.message || "Unexpected server error" });
    }
  }
  


export async function deleteProduct(req, res) {
    
    if (req.method !== "DELETE" && req.method !== "POST") {
      res.setHeader("Allow", ["DELETE", "POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  
  const { shop, accessToken, productId } =
      req.method === "DELETE" ? req.query : req.body;
  
    if (!shop || !accessToken || !productId) {
      return res
        .status(400)
        .json({ error: "Missing shop, accessToken or productId" });
    }
  
    
    const apiVersion = "2025-07";
    const url = `https://${shop}/admin/api/${apiVersion}/products/${productId}.json`;
  
    try {
      const resp = await fetch(url, {
        method: "DELETE",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });
  
      if (resp.status === 200) {
        
        return res.status(200).json({ success: true });
      }
  
      
      const detail = await resp.text();
      return res
        .status(resp.status)
        .json({ error: "Failed to delete product", detail });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: err.message || "Unexpected server error" });
    }
  }
  


  