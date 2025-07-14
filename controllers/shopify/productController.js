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


// export default async function getAllProducts(req, res) {
    
//     if (req.method !== 'POST') {
//       res.setHeader('Allow', ['POST']);
//       return res.status(405).end(`Method ${req.method} Not Allowed`);
//     }
  
    
//     const { shop, accessToken } = req.body || {};
//     if (!shop || !accessToken) {
//       return res.status(400).json({ error: 'Missing shop or access token' });
//     }
  
//     try {
//       const limit = 250;   
//       let sinceId = null;  
//       const allProducts = [];
  
//       while (true) {
//         let url = `https://${shop}/admin/api/2025-07/products.json?limit=${limit}`;
//         if (sinceId) url += `&since_id=${sinceId}`;
  
//         const response = await fetch(url, {
//           headers: {
//             'X-Shopify-Access-Token': accessToken,
//             'Content-Type': 'application/json',
//           },
//         });
  
//         if (!response.ok) {
//           const errorData = await response.text();
//           console.error('Failed to fetch products from Shopify:', errorData);
//           throw new Error('Failed to fetch products from Shopify');
//         }
  
//         const { products = [] } = await response.json();
  
//         if (products.length === 0) break;
//         allProducts.push(...products);
//         sinceId = products[products.length - 1].id; 
  
//         if (products.length < limit) break;       
//       }
  
//       // 4. Success
//       return res.status(200).json({
//         products: allProducts,
//         count: allProducts.length,
//       });
//     } catch (error) {
//       console.error(error);
//       return res.status(500).json({
//         error: error.message || 'Failed to fetch products',
//       });
//     }
//   }
  
  export default async function getAllProducts(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  
    const { shop, accessToken, filter } = req.body || {};
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
  
        // Apply filter if specified
        let filteredProducts = products;
        if (filter) {
          filteredProducts = products.filter(product => {
            const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
            
            switch (filter) {
              case 'hs_pending':
                const hasHSStatus = tags.some(tag => tag.startsWith('hs_status_'));
                const isPending = tags.some(tag => tag === 'hs_status_pending');
                return !hasHSStatus || isPending;
              
              case 'hs_approved':
                return tags.some(tag => tag === 'hs_status_approved');
              
              case 'hs_modified':
                return tags.some(tag => tag === 'hs_status_modified');
              
              default:
                return true;
            }
          });
        }
  
        // Add HS code data to each product
        const productsWithHSData = filteredProducts.map(product => {
          const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
          const hsCodeData = {};
          
          tags.forEach(tag => {
            if (tag.startsWith('hs_code_')) {
              hsCodeData.hsCode = tag.replace('hs_code_', '');
            } else if (tag.startsWith('hs_confidence_')) {
              hsCodeData.confidence = parseInt(tag.replace('hs_confidence_', ''));
            } else if (tag.startsWith('hs_status_')) {
              hsCodeData.hsStatus = tag.replace('hs_status_', '');
            }
          });
  
          return {
            ...product,
            ...hsCodeData
          };
        });
  
        allProducts.push(...productsWithHSData);
        sinceId = products[products.length - 1].id; 
  
        if (products.length < limit) break;       
      }
  
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
   

// export async function getProductID(req, res) {
//     if (req.method !== "POST") {
//       res.setHeader("Allow", ["POST"]);
//       return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
//     }
  
//     const { shop, accessToken, productId } = req.body || {};
//     if (!shop || !accessToken || !productId) {
//       return res
//         .status(400)
//         .json({ error: "Missing required parameters (shop, accessToken, productId)" });
//     }
  
//     try {
//       const apiVersion = "2025-07";
      
//       // Fetch product
//       const productUrl = `https://${shop}/admin/api/${apiVersion}/products/${productId}.json`;
//       console.log("Fetching product from URL:", productUrl);
      
//       const productResponse = await fetch(productUrl, {
//         headers: {
//           "X-Shopify-Access-Token": accessToken,
//           "Content-Type": "application/json",
//         },
//       });
  
//       if (!productResponse.ok) {
//         const text = await productResponse.text();
//         console.error("Shopify error:", text);
//         return res.status(500).json({ error: "Failed to fetch product from Shopify" });
//       }
  
//       const productData = await productResponse.json();
//       console.log("Product Data:", JSON.stringify(productData, null, 2));
  
//       // Fetch metafields separately
//       const metafieldsUrl = `https://${shop}/admin/api/${apiVersion}/products/${productId}/metafields.json`;
//       console.log("Fetching metafields from URL:", metafieldsUrl);
      
//       const metafieldsResponse = await fetch(metafieldsUrl, {
//         headers: {
//           "X-Shopify-Access-Token": accessToken,
//           "Content-Type": "application/json",
//         },
//       });
  
//       if (metafieldsResponse.ok) {
//         const metafieldsData = await metafieldsResponse.json();
//         console.log("Metafields Data:", JSON.stringify(metafieldsData, null, 2));
//         productData.product.metafields = metafieldsData.metafields;
//       } else {
//         console.log("Failed to fetch metafields. Status:", metafieldsResponse.status);
//         const errorText = await metafieldsResponse.text();
//         console.log("Metafields error:", errorText);
//       }
  
//       console.log("Final Product Data with Metafields:", JSON.stringify(productData, null, 2));
//       return res.status(200).json(productData);
//     } catch (err) {
//       console.error("Error in getProductID:", err);
//       return res.status(500).json({ error: err.message || "Unexpected server error" });
//     }
//   }


export async function getProductID(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, productId } = req.body || {};
  if (!shop || !accessToken || !productId) {
    return res.status(400).json({ error: "Missing required parameters (shop, accessToken, productId)" });
  }

  try {
    const apiVersion = "2025-07";
    const url = `https://${shop}/admin/api/${apiVersion}/products/${productId}.json`;
    
    const productResponse = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!productResponse.ok) {
      const detail = await productResponse.text();
      return res.status(500).json({ error: "Failed to fetch product from Shopify", detail });
    }

    const productData = await productResponse.json();
    // console.log("Raw Product Data:", JSON.stringify(productData, null, 2));
    

    const tags = productData.product.tags ? productData.product.tags.split(',').map(tag => tag.trim()) : [];
   
    const hsCodeData = {};
    
    tags.forEach(tag => {
      if (tag.startsWith('hs_code_')) {
        hsCodeData.suggestedCode = tag.replace('hs_code_', '');
      } else if (tag.startsWith('hs_confidence_')) {
        hsCodeData.confidence = parseInt(tag.replace('hs_confidence_', ''));
      } else if (tag.startsWith('hs_status_')) {
        hsCodeData.status = tag.replace('hs_status_', '');
      }
    });

    // console.log("Extracted HS Code Data:", hsCodeData);

    const responseData = {
      ...productData.product,
      hsCode: hsCodeData
    };

    // console.log("Final Response Data:", JSON.stringify(responseData, null, 2));
    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Error in getProductID:", err);
    return res.status(500).json({ error: err.message || "Unexpected server error" });
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
  

// export async function updateProductMetadata(req, res) {
//     if (req.method !== "POST") {
//       res.setHeader("Allow", ["POST"]);
//       return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
//     }
  
//     const { shop, accessToken, productId, metadata } = req.body || {};
//     if (!shop || !accessToken || !productId || !metadata) {
//       return res.status(400).json({ error: "Missing required parameters" });
//     }
  
//     try {
//       const apiVersion = "2025-07";
//       const metafields = [
//         {
//           namespace: "hs_code",
//           key: "suggested_code",
//           value: metadata.suggestedCode,
//           type: "single_line_text_field"
//         },
//         {
//           namespace: "hs_code", 
//           key: "confidence",
//           value: metadata.confidence.toString(),
//           type: "number_integer"
//         },
//         {
//           namespace: "hs_code",
//           key: "alternative_codes",
//           value: JSON.stringify(metadata.alternativeCodes),
//           type: "json"
//         },
//         {
//           namespace: "hs_code",
//           key: "status",
//           value: "approved",
//           type: "single_line_text_field"
//         }
//       ];
  
//       // console.log("Creating metafields for product:", productId);
//       // console.log("Metafields to create:", JSON.stringify(metafields, null, 2));
  
//       // Create each metafield separately
//       for (const metafield of metafields) {
//         const url = `https://${shop}/admin/api/${apiVersion}/products/${productId}/metafields.json`;
        
//         const response = await fetch(url, {
//           method: "POST",
//           headers: {
//             "X-Shopify-Access-Token": accessToken,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ metafield }),
//         });
  
//         if (!response.ok) {
//           const detail = await response.text();
//           console.error(`Failed to create metafield ${metafield.key}:`, detail);
//         }
//         //  else {
//         //   const result = await response.json();
//         //   console.log(`Successfully created metafield ${metafield.key}:`, JSON.stringify(result, null, 2));
//         // }
//       }
  
//       // console.log("Metadata update completed successfully");
//       return res.status(200).json({ success: true });
//     } catch (err) {
//       console.error("Error in updateProductMetadata:", err);
//       return res.status(500).json({ error: err.message || "Unexpected server error" });
//     }
//   }
  
export async function updateProductMetadata(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, productId, metadata } = req.body || {};
  if (!shop || !accessToken || !productId || !metadata) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const apiVersion = "2025-07";
    const url = `https://${shop}/admin/api/${apiVersion}/products/${productId}.json`;

    const getResponse = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!getResponse.ok) {
      const detail = await getResponse.text();
      return res.status(500).json({ error: "Failed to fetch current product", detail });
    }

    const currentProduct = await getResponse.json();
    const existingTags = currentProduct.product.tags ? currentProduct.product.tags.split(',').map(tag => tag.trim()) : [];
    
    const filteredTags = existingTags.filter(tag => !tag.startsWith('hs_'));
    const metadataTags = [
      `hs_code_${metadata.suggestedCode}`,
      `hs_confidence_${metadata.confidence}`,
      `hs_status_${metadata.status || 'pending'}`
    ];

    const newTags = [...filteredTags, ...metadataTags];

    const updatePayload = {
      product: {
        tags: newTags.join(', ')
      }
    };

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(500).json({ error: "Failed to update product tags", detail });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in updateProductMetadata:", err);
    return res.status(500).json({ error: err.message || "Unexpected server error" });
  }
}



