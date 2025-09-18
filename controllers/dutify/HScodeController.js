
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

export async function detectHSCode(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { productName, description, category } = req.body || {};

  if (!productName || !description) {
    return res.status(400).json({ 
      error: 'Missing required parameters: productName and description are required' 
    });
  }

  try {
    const apiKey = process.env.DUTIFY_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'Dutify API key not configured' });
    }

    // Format request according to Dutify API documentation
    const requestBody = {
      data: {
        attributes: {
          product_name: productName,
          product_description: description,
          product_category: category || "",
          country_code: "US" // Country code in ISO 3166-1 format
        }
      }
    };

    console.log('Sending request to Dutify API:', JSON.stringify(requestBody));

    // Call Dutify API for HS code lookup
    const response = await fetch('https://dutify.com/api/v1/hs_lookups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const dutifyData = await response.json();
    console.log('Dutify API response:', JSON.stringify(dutifyData));
    
    if (!response.ok) {
      let errorMessage = 'Failed to detect HS code';
      if (dutifyData.errors && dutifyData.errors.length > 0) {
        errorMessage = dutifyData.errors[0].detail || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Extract HS code suggestions from response
    const suggestions = dutifyData.data?.attributes?.suggestions || [];
    
    // Format the suggestions
    const formattedSuggestions = suggestions.map(suggestion => ({
      code: suggestion.hs_code,
      confidence: Math.round(suggestion.confidence * 100),
      description: suggestion.description || ""
    }));

    // Save lookup to database
    // Change this part in the function:
const { data, error } = await supabase
.from('product_hs_codes')
.upsert({
  product_id: productId,
  shop_domain: shop,
  product_name: productName,
  hs_code: primarySuggestion.code,
  confidence: primarySuggestion.confidence,
  status: 'pending',
  alternative_codes: formattedSuggestions.slice(1),
  updated_at: new Date().toISOString()
}, { onConflict: 'product_id, shop_domain' }) // Specify both columns for the conflict constraint
.select();


    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: {
        id: data[0].id,
        suggestions: formattedSuggestions
      }
    });
  } catch (err) {
    console.error('Error detecting HS code:', err);
    return res.status(500).json({
      error: err.message || 'Failed to detect HS code',
      details: 'Please check the API key and request parameters'
    });
  }
}


export async function detectProductHSCode(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, productId } = req.body || {};
  
  if (!shop || !accessToken || !productId) {
    return res.status(400).json({ 
      error: 'Missing required parameters (shop, accessToken, productId)' 
    });
  }

  try {
    console.log(`Starting HS code detection for product ${productId}`);
    
    // 1. Get product details from Shopify using GraphQL
    const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
    
    const getProductQuery = `
      query product($id: ID!) {
        product(id: $id) {
          id
          title
          descriptionHtml
          productType
        }
      }
    `;

    const productData = await graphqlRequest(shop, accessToken, getProductQuery, { id: gid });
    const product = productData.product;
    
    if (!product) {
      return res.status(404).json({ 
        error: 'Product not found',
        details: `Product with ID ${productId} not found`
      });
    }

    const productName = product.title;
    let description = product.descriptionHtml ? product.descriptionHtml.replace(/<[^>]*>/g, '').trim() : "";
    const category = product.productType || "";
    
    // Ensure description is meaningful for Dutify API
    if (!description || description.length < 10) {
      description = `${productName} - ${category || 'product'} for classification`;
    }

    // 2. Call Dutify API to detect HS code
    const apiKey = process.env.DUTIFY_API_KEY;
    
    if (!apiKey) {
      console.error('Dutify API key not configured');
      return res.status(400).json({ error: 'Dutify API key not configured' });
    }

    // Format request according to Dutify API documentation
    const requestBody = {
      data: {
        description: description,
        country_code: "US"
      }
    };

    console.log('Sending request to Dutify API:', JSON.stringify(requestBody));

    // Call Dutify API for HS code lookup
    const dutifyResponse = await fetch('https://dutify.com/api/v1/hs_lookups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const dutifyData = await dutifyResponse.json();
    console.log('Dutify API response:', JSON.stringify(dutifyData));
    
    if (!dutifyResponse.ok || (dutifyData.data && dutifyData.data[0] && dutifyData.data[0].type === 'error')) {
      let errorMessage = 'Failed to detect HS code';
      if (dutifyData.data && dutifyData.data[0] && dutifyData.data[0].type === 'error') {
        const errors = dutifyData.data.filter(item => item.type === 'error');
        errorMessage = errors.map(err => err.attributes.message).join(', ');
      }
      console.error(`Dutify API error: ${errorMessage}`);
      return res.status(500).json({ 
        error: errorMessage,
        details: dutifyData
      });
    }

    // 3. Extract HS code suggestions from response
    const suggestions = dutifyData.data?.attributes?.suggestions || [];
    
    // Format the suggestions
    const formattedSuggestions = suggestions.map(suggestion => ({
      code: suggestion.hs_code,
      confidence: Math.round(suggestion.confidence * 100),
      description: suggestion.description || ""
    }));

    // If no suggestions found, try to extract from included data
    if (formattedSuggestions.length === 0 && dutifyData.included && dutifyData.included.length > 0) {
      const hsLookupItems = dutifyData.included.filter(item => item.type === "hs_lookup_item");
      if (hsLookupItems.length > 0) {
        hsLookupItems.forEach(item => {
          formattedSuggestions.push({
            code: item.attributes.hs_code,
            confidence: 95, // Default high confidence
            description: item.attributes.description || ""
          });
        });
      }
    }

    // Get the primary suggestion (highest confidence)
    const primarySuggestion = formattedSuggestions.length > 0 ? formattedSuggestions[0] : null;
    
    if (!primarySuggestion) {
      console.log('No suggestions found in Dutify response');
      return res.status(400).json({ error: 'No HS code suggestions found' });
    }

    // 4. Return the result without saving to database or updating Shopify
    console.log('HS code detection completed successfully');
    return res.status(200).json({
      success: true,
      productId,
      productName,
      suggestedCode: primarySuggestion.code,
      confidence: primarySuggestion.confidence,
      status: 'pending'
    });
  } catch (err) {
    console.error("Error detecting HS code:", err);
    return res.status(500).json({
      error: err.message || "Failed to detect HS code"
    });
  }
}




export async function saveProductHSCode(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { 
    shop, 
    accessToken, 
    productId, 
    productName, 
    hsCode, 
    confidence, 
    status = 'pending'
  } = req.body || {};

  if (!shop || !accessToken || !productId || !productName || !hsCode) {
    return res.status(400).json({ 
      error: 'Missing required parameters' 
    });
  }

  try {
    const gid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
    
    // Get current product data using GraphQL
    const getProductQuery = `
      query product($id: ID!) {
        product(id: $id) {
          id
          title
          tags
          descriptionHtml
          productType
        }
      }
    `;

    const productData = await graphqlRequest(shop, accessToken, getProductQuery, { id: gid });
    const product = productData.product;
    const description = product.descriptionHtml ? product.descriptionHtml.replace(/<[^>]*>/g, '') : "";
    const category = product.productType || "";

    // Save to Supabase
    const { data, error } = await supabase
      .from('product_hs_codes')
      .upsert({
        product_id: productId,
        shop_domain: shop,
        product_name: productName,
        product_description: description,
        product_category: category,
        hs_code: hsCode,
        confidence: parseInt(confidence) || 0,
        status: status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'product_id, shop_domain' })
      .select();

    if (error) throw error;

    // Also save to dutify_hs_lookups table for history
    await supabase
      .from('dutify_hs_lookups')
      .insert({
        product_name: productName,
        product_description: description,
        product_category: category,
        suggestions: [{
          code: hsCode,
          confidence: parseInt(confidence) || 0,
          description: ""
        }]
      });

    // Update product tags using GraphQL
    const existingTags = product.tags || [];
    const filteredTags = existingTags.filter(tag => 
      !tag.startsWith('hs_code_') && 
      !tag.startsWith('hs_confidence_') && 
      !tag.startsWith('hs_status_')
    );
    
    const newTags = [
      ...filteredTags,
      `hs_code_${hsCode}`,
      `hs_confidence_${confidence}`,
      `hs_status_${status}`
    ];

    const updateMutation = `
      mutation productUpdate($id: ID!, $product: ProductInput!) {
        productUpdate(id: $id, product: $product) {
          product {
            id
            tags
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const updateData = await graphqlRequest(shop, accessToken, updateMutation, {
      id: gid,
      product: {
        tags: newTags
      }
    });

    if (updateData.productUpdate.userErrors && updateData.productUpdate.userErrors.length > 0) {
      throw new Error(`GraphQL errors: ${JSON.stringify(updateData.productUpdate.userErrors)}`);
    }

    return res.status(200).json({
      success: true,
      data: data[0]
    });
  } catch (err) {
    console.error('Error saving product HS code:', err);
    return res.status(500).json({
      error: err.message || 'Failed to save product HS code'
    });
  }
}



export async function getHSCodeHistory(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { data, error } = await supabase
      .from('dutify_hs_lookups')
      .select('id, product_name, product_category, suggestions, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return res.status(200).json({ lookups: data });
  } catch (err) {
    console.error('Error fetching HS code history:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
}
