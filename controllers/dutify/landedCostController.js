import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function mockLandedCostCalculation(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { 
    productValue, 
    quantity, 
    shippingCost = 0, 
    insurance = 0, 
    originCountry, 
    destinationCountry, 
    hsCode, 
    description,
    currency = 'USD'
  } = req.body || {};

  // Validate required fields
  if (!productValue || !quantity || !originCountry || !destinationCountry) {
    return res.status(400).json({ 
      error: 'Missing required parameters. Please provide productValue, quantity, originCountry, and destinationCountry.' 
    });
  }

  try {
    // Calculate mock values
    const subtotal = parseFloat(productValue) * parseInt(quantity);
    
    // Different duty rates based on destination country
    const dutyRates = {
      'US': 3.5,
      'GB': 4.7,
      'DE': 5.1,
      'FR': 5.3,
      'CA': 4.2,
      'AU': 5.0,
      'JP': 6.1
    };
    
    // Different VAT rates based on destination country
    const vatRates = {
      'US': 0,      // No VAT in US
      'GB': 20,     // UK VAT
      'DE': 19,     // German VAT
      'FR': 20,     // French VAT
      'CA': 5,      // Canadian GST
      'AU': 10,     // Australian GST
      'JP': 10      // Japanese Consumption Tax
    };
    
    const dutyRate = dutyRates[destinationCountry] || 5.0;
    const vatRate = vatRates[destinationCountry] || 15.0;
    
    const dutyAmount = subtotal * (dutyRate / 100);
    const vatBase = subtotal + dutyAmount + parseFloat(shippingCost);
    const vatAmount = vatBase * (vatRate / 100);
    
    const totalDuties = dutyAmount;
    const totalTaxes = vatAmount;
    const totalFees = 0;
    const totalLandedCost = subtotal + totalDuties + totalTaxes + parseFloat(shippingCost) + parseFloat(insurance);
    
    // Create mock response
    const mockResponse = {
      origin_country: originCountry,
      destination_country: destinationCountry,
      currency: currency,
      total_landed_cost: totalLandedCost,
      total_duties: totalDuties,
      total_taxes: totalTaxes,
      total_fees: totalFees,
      items: [
        {
          hs_code: hsCode || '',
          description: description || 'Product',
          quantity: parseInt(quantity),
          unit_price: parseFloat(productValue) / parseInt(quantity),
          duty_rate: dutyRate,
          duty_amount: dutyAmount,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          shipping_cost: parseFloat(shippingCost),
          insurance: parseFloat(insurance)
        }
      ]
    };

    // Save to database
    const { data, error } = await supabase
      .from('dutify_landed_costs')
      .insert({
        product_value: parseFloat(productValue) || 0,
        quantity: parseInt(quantity) || 0,
        shipping_cost: parseFloat(shippingCost) || 0,
        insurance: parseFloat(insurance) || 0,
        origin_country: originCountry,
        destination_country: destinationCountry,
        hs_code: hsCode || '',
        description: description || '',
        currency: currency,
        
        total_landed_cost: totalLandedCost,
        total_duties: totalDuties,
        total_taxes: totalTaxes,
        total_fees: totalFees,
        
        full_response: mockResponse,
        
        item_duty_rate: dutyRate,
        item_duty_amount: dutyAmount,
        item_vat_rate: vatRate,
        item_vat_amount: vatAmount,
        
        margin: ((totalLandedCost - subtotal) / subtotal) * 100
      })
      .select();

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      data: data[0],
      dutifyResponse: mockResponse
    });
  } catch (err) {
    console.error('Error in mock calculation:', err);
    return res.status(500).json({ error: err.message || 'Failed to calculate landed cost' });
  }
}


export async function getDutifyLandedCostHistory(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { data, error } = await supabase
      .from('dutify_landed_costs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return res.status(200).json({ calculations: data });
  } catch (err) {
    console.error('Error fetching landed cost history:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
}


export async function getDutifyLandedCostStats(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Today's calculations
    const { data: todayData, error: todayError } = await supabase
      .from('dutify_landed_costs')
      .select('id')
      .gte('created_at', new Date().toISOString().split('T')[0]);

    // Average duty rate
    const { data: dutyData, error: dutyError } = await supabase
      .from('dutify_landed_costs')
      .select('item_duty_rate');

    // Average margin
    const { data: marginData, error: marginError } = await supabase
      .from('dutify_landed_costs')
      .select('margin');

    if (todayError || dutyError || marginError) {
      throw new Error('Database query failed');
    }

    const avgDutyRate = dutyData.length > 0 
      ? dutyData.reduce((sum, item) => sum + item.item_duty_rate, 0) / dutyData.length 
      : 0;

    const avgMargin = marginData.length > 0 
      ? marginData.reduce((sum, item) => sum + item.margin, 0) / marginData.length 
      : 0;

    return res.status(200).json({
      calculationsToday: todayData.length,
      avgDutyRate: avgDutyRate.toFixed(1),
      avgMargin: avgMargin.toFixed(1)
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch stats' });
  }
}


export async function getDutifyLandedCostById(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.body || {};
  
  if (!id) {
    return res.status(400).json({ error: 'Missing calculation ID' });
  }

  try {
    const { data, error } = await supabase
      .from('dutify_landed_costs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching landed cost calculation:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch calculation' });
  }
}





// export async function calculateLandedCost(req, res) {
//   if (req.method !== 'POST') {
//     res.setHeader('Allow', ['POST']);
//     return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
//   }

//   const { 
//     productValue, 
//     quantity, 
//     shippingCost = 0, 
//     insurance = 0, 
//     originCountry, 
//     destinationCountry, 
//     hsCode, 
//     description,
//     currency = 'USD'
//   } = req.body || {};

//   // Validate required fields
//   if (!productValue || !quantity || !originCountry || !destinationCountry) {
//     return res.status(400).json({ 
//       error: 'Missing required parameters. Please provide productValue, quantity, originCountry, and destinationCountry.' 
//     });
//   }

//   // List of supported countries by Dutify
//   const supportedCountries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'GR', 'FI', 'SE', 'DK', 'NO', 'JP', 'KR', 'SG', 'NZ'];
  
//   // Check if countries are supported
//   if (!supportedCountries.includes(originCountry)) {
//     return res.status(400).json({ 
//       error: `Origin country "${originCountry}" is not supported. Supported countries: ${supportedCountries.join(', ')}` 
//     });
//   }
  
//   if (!supportedCountries.includes(destinationCountry)) {
//     return res.status(400).json({ 
//       error: `Destination country "${destinationCountry}" is not supported. Supported countries: ${supportedCountries.join(', ')}` 
//     });
//   }

//   try {
//     const apiKey = process.env.DUTIFY_API_KEY;
    
//     if (!apiKey) {
//       return res.status(400).json({ error: 'Dutify API key not configured' });
//     }

//     // Format request according to Dutify API documentation
//     const requestBody = {
//       data: {
//         export_country_code: originCountry,
//         import_country_code: destinationCountry,
//         input_currency_code: currency,
//         shipping_cost: parseFloat(shippingCost) || 0,
//         insurance_cost: parseFloat(insurance) || 0,
//         line_items: [
//           {
//             origin_country_code: originCountry,
//             unit_price: parseFloat(productValue) / parseInt(quantity),
//             quantity: parseInt(quantity),
//             product_title: description || 'Product',
//             product_classification_hs: hsCode || ''
//           }
//         ]
//       }
//     };

//     // Call Dutify API
//     const response = await fetch('https://dutify.com/api/v1/landed_cost_calculator', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-API-KEY': apiKey
//       },
//       body: JSON.stringify(requestBody)
//     });

//     const dutifyData = await response.json();
    
//     if (!response.ok) {
//       // Extract error message from Dutify response
//       let errorMessage = 'Failed to calculate landed cost';
//       if (dutifyData.data && Array.isArray(dutifyData.data)) {
//         const errorObj = dutifyData.data.find(item => item.type === 'error');
//         if (errorObj && errorObj.attributes) {
//           errorMessage = `${errorObj.attributes.message} (${errorObj.attributes.attribute})`;
//         }
//       }
//       throw new Error(errorMessage);
//     }

//     // Calculate subtotal for margin calculation
//     const subtotal = parseFloat(productValue) * parseInt(quantity);
    
//     // Extract relevant data from the response
//     const attributes = dutifyData.data?.attributes || {};
//     const responseCurrency = attributes.currency_code || currency;
    
//     // Get the first line item from the included data
//     const lineItem = dutifyData.included?.find(item => item.type === 'landed_cost_result_item');
//     const lineItemAttributes = lineItem?.attributes || {};
    
//     // Hardcoded exchange rates to USD
//     const exchangeRatesToUSD = {
//       'USD': 1.0,
//       'EUR': 1.09,
//       'GBP': 1.27,
//       'JPY': 0.0068,
//       'CAD': 0.74,
//       'AUD': 0.66,
//       'CNY': 0.14,
//       'INR': 0.012
//     };
    
//     // Calculate margin in USD
//     let margin;
    
//     if (responseCurrency === 'USD') {
//       // If already in USD, direct calculation
//       margin = subtotal > 0 ? 
//         ((parseFloat(attributes.landed_cost_total || 0) - subtotal) / subtotal) * 100 : 0;
//     } else {
//       // Convert to USD for margin calculation
//       const exchangeRate = exchangeRatesToUSD[responseCurrency] || 1;
//       const landedCostUSD = parseFloat(attributes.landed_cost_total || 0) * exchangeRate;
//       const subtotalUSD = subtotal * exchangeRatesToUSD[currency];
      
//       margin = subtotalUSD > 0 ? 
//         ((landedCostUSD - subtotalUSD) / subtotalUSD) * 100 : 0;
//     }
    
//     // Format data for database
//     const formattedData = {
//       // Request parameters
//       product_value: parseFloat(productValue) || 0,
//       quantity: parseInt(quantity) || 0,
//       shipping_cost: parseFloat(shippingCost) || 0,
//       insurance: parseFloat(insurance) || 0,
//       origin_country: originCountry,
//       destination_country: destinationCountry,
//       hs_code: lineItemAttributes.hs_code || hsCode || '',
//       description: description || '',
//       currency: responseCurrency,
      
//       // Dutify response data
//       total_landed_cost: parseFloat(attributes.landed_cost_total || 0),
//       total_duties: parseFloat(attributes.duty_total || 0),
//       total_taxes: parseFloat(attributes.sales_tax_total || 0),
//       total_fees: parseFloat(attributes.additional_tax_and_charges_total || 0),
      
//       // Store the complete response as JSON
//       full_response: dutifyData,
      
//       // Item specific data
//       item_duty_rate: parseFloat(attributes.duty_total || 0) > 0 ? 
//         (parseFloat(attributes.duty_total) / subtotal) * 100 : 0,
//       item_duty_amount: parseFloat(attributes.duty_total || 0),
//       item_vat_rate: parseFloat(attributes.sales_tax_total || 0) > 0 ? 
//         (parseFloat(attributes.sales_tax_total) / subtotal) * 100 : 0,
//       item_vat_amount: parseFloat(attributes.sales_tax_total || 0),
      
//       input_currency: currency,
//       // Calculate margin in USD
//       margin: margin
//     };

//     // Save to database
//     const { data, error } = await supabase
//       .from('dutify_landed_costs')
//       .insert(formattedData)
//       .select();

//     if (error) throw error;

//     return res.status(200).json({ 
//       success: true, 
//       data: data[0],
//       dutifyResponse: dutifyData
//     });
//   } catch (err) {
//     console.error('Error calculating landed cost:', err);
//     return res.status(500).json({ 
//       error: err.message || 'Failed to calculate landed cost',
//       details: 'Please check the API key and request parameters'
//     });
//   }
// }


export async function calculateLandedCost(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { 
    productValue, 
    quantity, 
    shippingCost = 0, 
    insurance = 0, 
    originCountry, 
    destinationCountry, 
    hsCode, 
    description,
    productTitle,
    currency = 'USD'
  } = req.body || {};

  // Validate required fields
  if (!productValue || !quantity || !originCountry || !destinationCountry) {
    return res.status(400).json({ 
      error: 'Missing required parameters. Please provide productValue, quantity, originCountry, and destinationCountry.' 
    });
  }

  // List of supported countries by Dutify
  const supportedCountries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'GR', 'FI', 'SE', 'DK', 'NO', 'JP', 'KR', 'SG', 'NZ'];
  
  // Check if countries are supported
  if (!supportedCountries.includes(originCountry)) {
    return res.status(400).json({ 
      error: `Origin country "${originCountry}" is not supported. Supported countries: ${supportedCountries.join(', ')}` 
    });
  }
  
  if (!supportedCountries.includes(destinationCountry)) {
    return res.status(400).json({ 
      error: `Destination country "${destinationCountry}" is not supported. Supported countries: ${supportedCountries.join(', ')}` 
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
        export_country_code: originCountry,
        import_country_code: destinationCountry,
        input_currency_code: currency,
        shipping_cost: parseFloat(shippingCost) || 0,
        insurance_cost: parseFloat(insurance) || 0,
        line_items: [
          {
            origin_country_code: originCountry,
            unit_price: parseFloat(productValue) / parseInt(quantity),
            quantity: parseInt(quantity),
            product_title: productTitle || description || 'Product',
            product_classification_hs: hsCode || ''
          }
        ]
      }
    };

    // Call Dutify API
    const response = await fetch('https://dutify.com/api/v1/landed_cost_calculator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const dutifyData = await response.json();
    
    if (!response.ok) {
      // Extract error message from Dutify response
      let errorMessage = 'Failed to calculate landed cost';
      if (dutifyData.data && Array.isArray(dutifyData.data)) {
        const errorObj = dutifyData.data.find(item => item.type === 'error');
        if (errorObj && errorObj.attributes) {
          errorMessage = `${errorObj.attributes.message} (${errorObj.attributes.attribute})`;
        }
      }
      throw new Error(errorMessage);
    }

    // Calculate subtotal for margin calculation
    const subtotal = parseFloat(productValue) * parseInt(quantity);
    
    // Extract relevant data from the response
    const attributes = dutifyData.data?.attributes || {};
    const responseCurrency = attributes.currency_code || currency;
    
    // Get the first line item from the included data
    const lineItem = dutifyData.included?.find(item => item.type === 'landed_cost_result_item');
    const lineItemAttributes = lineItem?.attributes || {};
    
    // Hardcoded exchange rates to USD
    const exchangeRatesToUSD = {
      'USD': 1.0,
      'EUR': 1.09,
      'GBP': 1.27,
      'JPY': 0.0068,
      'CAD': 0.74,
      'AUD': 0.66,
      'CNY': 0.14,
      'INR': 0.012
    };
    
    // Calculate margin in USD
    let margin;
    
    if (responseCurrency === 'USD') {
      // If already in USD, direct calculation
      margin = subtotal > 0 ? 
        ((parseFloat(attributes.landed_cost_total || 0) - subtotal) / subtotal) * 100 : 0;
    } else {
      // Convert to USD for margin calculation
      const exchangeRate = exchangeRatesToUSD[responseCurrency] || 1;
      const landedCostUSD = parseFloat(attributes.landed_cost_total || 0) * exchangeRate;
      const subtotalUSD = subtotal * exchangeRatesToUSD[currency];
      
      margin = subtotalUSD > 0 ? 
        ((landedCostUSD - subtotalUSD) / subtotalUSD) * 100 : 0;
    }
    
    // Format data for database
    const formattedData = {
      // Request parameters
      product_value: parseFloat(productValue) || 0,
      quantity: parseInt(quantity) || 0,
      shipping_cost: parseFloat(shippingCost) || 0,
      insurance: parseFloat(insurance) || 0,
      origin_country: originCountry,
      destination_country: destinationCountry,
      hs_code: lineItemAttributes.hs_code || hsCode || '',
      description: description || '',
      product_title: productTitle || '',
      currency: responseCurrency,
      
      // Dutify response data
      total_landed_cost: parseFloat(attributes.landed_cost_total || 0),
      total_duties: parseFloat(attributes.duty_total || 0),
      total_taxes: parseFloat(attributes.sales_tax_total || 0),
      total_fees: parseFloat(attributes.additional_tax_and_charges_total || 0),
      
      // Store the complete response as JSON
      full_response: dutifyData,
      
      // Item specific data
      item_duty_rate: parseFloat(attributes.duty_total || 0) > 0 ? 
        (parseFloat(attributes.duty_total) / subtotal) * 100 : 0,
      item_duty_amount: parseFloat(attributes.duty_total || 0),
      item_vat_rate: parseFloat(attributes.sales_tax_total || 0) > 0 ? 
        (parseFloat(attributes.sales_tax_total) / subtotal) * 100 : 0,
      item_vat_amount: parseFloat(attributes.sales_tax_total || 0),
      
      input_currency: currency,
      margin: margin
    };

    // Save to database
    const { data, error } = await supabase
      .from('dutify_landed_costs')
      .insert(formattedData)
      .select();

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      data: data[0],
      dutifyResponse: dutifyData
    });
  } catch (err) {
    console.error('Error calculating landed cost:', err);
    return res.status(500).json({ 
      error: err.message || 'Failed to calculate landed cost',
      details: 'Please check the API key and request parameters'
    });
  }
}




export async function searchApprovedModifiedProducts(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { shop, accessToken, searchTerm } = req.body || {};
  
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
        throw new Error('Failed to fetch products from Shopify');
      }

      const { products = [] } = await response.json();
      if (products.length === 0) break;

      // Filter for approved and modified products
      const filteredProducts = products.filter(product => {
        const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
        return tags.some(tag => tag === 'hs_status_approved' || tag === 'hs_status_modified');
      });

      // Add HS code data and filter by search term
      const productsWithHSData = filteredProducts.map(product => {
        const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
        const hsCodeData = {};
        
        tags.forEach(tag => {
          if (tag.startsWith('hs_code_')) {
            hsCodeData.hsCode = tag.replace('hs_code_', '');
          } else if (tag.startsWith('hs_status_')) {
            hsCodeData.hsStatus = tag.replace('hs_status_', '');
          }
        });

        return {
          id: product.id,
          title: product.title,
          description: product.body_html?.replace(/<[^>]*>/g, '') || '',
          hsCode: hsCodeData.hsCode || '',
          hsStatus: hsCodeData.hsStatus || '',
          image: product.images?.[0]?.src || null
        };
      }).filter(product => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return product.title.toLowerCase().includes(search) ||
               product.description.toLowerCase().includes(search) ||
               product.hsCode.toLowerCase().includes(search);
      });

      allProducts.push(...productsWithHSData);
      sinceId = products[products.length - 1].id;

      if (products.length < limit) break;
    }

    return res.status(200).json({
      products: allProducts.slice(0, 20), // Limit to 20 results
      count: allProducts.length
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return res.status(500).json({ error: error.message || 'Failed to search products' });
  }
}


  
  
  
  