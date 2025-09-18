const graphqlRequest = async (shop, accessToken, query, variables = {}) => {
  const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
};

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
    const query = `
      query products($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              tags
              vendor
              productType
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const data = await graphqlRequest(shop, accessToken, query, { first: 5 });
    const products = data.products.edges.map(edge => edge.node);
    
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch products' });
  }
};

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
    const allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const query = `
        query products($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                handle
                status
                tags
                vendor
                productType
                createdAt
                updatedAt
                featuredImage {
                  url
                  altText
                }
                images(first: 5) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 5) {
                  edges {
                    node {
                      id
                      price
                      sku
                      inventoryQuantity
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const data = await graphqlRequest(shop, accessToken, query, {
        first: 250,
        after: cursor,
      });

      const products = data.products.edges.map(edge => edge.node);

      let filteredProducts = products;
      if (filter) {
        filteredProducts = products.filter(product => {
          const tags = product.tags || [];
          
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

      const productsWithHSData = filteredProducts.map(product => {
        const tags = product.tags || [];
        const hsCodeData = {};
        let complianceStatus = "pending";
        
        tags.forEach(tag => {
          if (tag.startsWith('hs_code_')) {
            hsCodeData.hsCode = tag.replace('hs_code_', '');
          } else if (tag.startsWith('hs_confidence_')) {
            hsCodeData.confidence = parseInt(tag.replace('hs_confidence_', ''));
          } else if (tag.startsWith('hs_status_')) {
            hsCodeData.hsStatus = tag.replace('hs_status_', '');
            complianceStatus = tag.replace('hs_status_', '');
          }
        });

        return {
          ...product,
          ...hsCodeData,
          complianceStatus
        };
      });

      allProducts.push(...productsWithHSData);
      
      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
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
    const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
    
    const query = `
      query product($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          status
          tags
          vendor
          productType
          createdAt
          updatedAt
          description
          descriptionHtml
          featuredImage {
            url
            altText
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
              }
            }
          }
          options {
            id
            name
            values
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                sku
                barcode
                inventoryQuantity
                availableForSale
                selectedOptions {
                  name
                  value
                }
                image {
                  url
                  altText
                }
              }
            }
          }
          seo {
            title
            description
          }
          totalInventory
          tracksInventory
          onlineStoreUrl
          onlineStorePreviewUrl
        }
      }
    `;

    const data = await graphqlRequest(shop, accessToken, query, { id: gid });
    const product = data.product;
    
    const tags = product.tags || [];
    const hsCodeData = {};
    let complianceStatus = "pending";
    
    tags.forEach(tag => {
      if (tag.startsWith('hs_code_')) {
        hsCodeData.suggestedCode = tag.replace('hs_code_', '');
      } else if (tag.startsWith('hs_confidence_')) {
        hsCodeData.confidence = parseInt(tag.replace('hs_confidence_', ''));
      } else if (tag.startsWith('hs_status_')) {
        const status = tag.replace('hs_status_', '');
        hsCodeData.status = status;
        complianceStatus = status;
      }
    });

    const response = {
      ...product,
      hsCode: hsCodeData,
      complianceStatus: complianceStatus,
      product: product
    };
    return res.status(200).json(response);
  } catch (err) {
    console.error("Error in getProductID:", err);
    return res.status(500).json({ error: err.message || "Unexpected server error" });
  }
}

export async function updateProductID(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, productId, productData } = req.body || {};
  if (!shop || !accessToken || !productId || !productData) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
    const numericId = productId.replace('gid://shopify/Product/', '');
    
    // Handle image removal first
    if (productData.removeImages && productData.removeImages.length > 0) {
      // Get current product images to find the correct image IDs
      const imagesUrl = `https://${shop}/admin/api/2024-10/products/${numericId}/images.json`;
      const imagesResponse = await fetch(imagesUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        }
      });
      
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        const currentImages = imagesData.images || [];
        
        for (const imageIdToRemove of productData.removeImages) {
          // Find the image by matching URL or ID
          const imageToDelete = currentImages.find(img => 
            img.src.includes(imageIdToRemove) || img.id.toString() === imageIdToRemove
          );
          
          if (imageToDelete) {
            const deleteUrl = `https://${shop}/admin/api/2024-10/products/${numericId}/images/${imageToDelete.id}.json`;
            
            const deleteResponse = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'X-Shopify-Access-Token': accessToken,
              }
            });

            if (!deleteResponse.ok) {
              console.error("Failed to delete image:", await deleteResponse.text());
            }
          }
        }
      }
    }

    // Handle image uploads using REST API
    if (productData.media && productData.media.length > 0) {
      for (const mediaItem of productData.media) {
        if (mediaItem.originalSource && mediaItem.originalSource.startsWith('data:')) {
          const base64Data = mediaItem.originalSource.split(',')[1];
          const restUrl = `https://${shop}/admin/api/2024-10/products/${numericId}/images.json`;
          
          const imageResponse = await fetch(restUrl, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: {
                attachment: base64Data,
                alt: mediaItem.alt || ""
              }
            })
          });

          if (!imageResponse.ok) {
            console.error("Failed to upload image:", await imageResponse.text());
          }
        }
      }
    }

    // Update basic product info using GraphQL
    const updateMutation = `
      mutation productUpdate($id: ID!, $product: ProductInput!) {
        productUpdate(id: $id, product: $product) {
          product {
            id
            title
            vendor
            productType
            descriptionHtml
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const productInput = {};
    if (productData.title) productInput.title = productData.title;
    if (productData.body_html) productInput.descriptionHtml = productData.body_html;
    if (productData.vendor) productInput.vendor = productData.vendor;
    if (productData.product_type) productInput.productType = productData.product_type;

    const updateData = await graphqlRequest(shop, accessToken, updateMutation, { id: gid, product: productInput });

    if (updateData.productUpdate.userErrors && updateData.productUpdate.userErrors.length > 0) {
      console.error("GraphQL errors:", updateData.productUpdate.userErrors);
      return res.status(400).json({ 
        error: "Update failed", 
        details: updateData.productUpdate.userErrors 
      });
    }

    return res.status(200).json({ 
      success: true, 
      product: updateData.productUpdate.product 
    });
  } catch (err) {
    console.error("Error in updateProductID:", err);
    return res.status(500).json({ error: err.message || "Unexpected server error" });
  }
}


export async function createProduct(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, productData } = req.body || {};
  if (!shop || !accessToken || !productData) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const mutation = `
      mutation productCreate($product: ProductInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const productInput = {
      title: productData.title || "New Product",
      descriptionHtml: productData.body_html || "",
      vendor: productData.vendor || "",
      productType: productData.product_type || "",
      status: "ACTIVE",
      variants: [{
        price: productData.price || "0.00",
        sku: productData.sku || "",
        inventoryManagement: "SHOPIFY"
      }]
    };

    const data = await graphqlRequest(shop, accessToken, mutation, { product: productInput });

    if (data.productCreate.userErrors && data.productCreate.userErrors.length > 0) {
      return res.status(400).json({ 
        error: "Create failed", 
        details: data.productCreate.userErrors 
      });
    }

    const createdProduct = data.productCreate.product;
    const productId = createdProduct.id.replace('gid://shopify/Product/', '');

    // Handle image uploads if provided
    if (productData.media && productData.media.length > 0) {
      for (const mediaItem of productData.media) {
        if (mediaItem.originalSource && mediaItem.originalSource.startsWith('data:')) {
          const base64Data = mediaItem.originalSource.split(',')[1];
          const restUrl = `https://${shop}/admin/api/2024-10/products/${productId}/images.json`;
          
          const imageResponse = await fetch(restUrl, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: {
                attachment: base64Data,
                alt: mediaItem.alt || ""
              }
            })
          });

          if (!imageResponse.ok) {
            console.error("Failed to upload image:", await imageResponse.text());
          }
        }
      }
    }

    return res.status(201).json({ 
      success: true, 
      product: createdProduct 
    });
  } catch (err) {
    console.error("Error in createProduct:", err);
    return res.status(500).json({ error: err.message || "Unexpected server error" });
  }
}


export async function deleteProduct(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, productId } = req.body || {};
  if (!shop || !accessToken || !productId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const mutation = `
      mutation productDelete($id: ID!) {
        productDelete(id: $id) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
    
    const data = await graphqlRequest(shop, accessToken, mutation, {
      id: gid
    });

    if (data.productDelete.userErrors.length > 0) {
      return res.status(400).json({ 
        error: "Delete failed", 
        details: data.productDelete.userErrors 
      });
    }

    return res.status(200).json({ 
      success: true, 
      deletedProductId: data.productDelete.deletedProductId 
    });
  } catch (err) {
    console.error("Error in deleteProduct:", err);
    return res.status(500).json({ error: err.message || "Unexpected server error" });
  }
}

export async function updateProductMetadata(req, res) {
  return await updateProductID(req, res);
}
