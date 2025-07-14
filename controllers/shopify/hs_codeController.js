export async function getPendingReviewCount(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  
    const { shop, accessToken } = req.body || {};
    if (!shop || !accessToken) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
  
    try {
      const apiVersion = "2025-07";
      let sinceId = null;
      let pendingCount = 0;
      const limit = 250;
  
      while (true) {
        let url = `https://${shop}/admin/api/${apiVersion}/products.json?limit=${limit}`;
        if (sinceId) url += `&since_id=${sinceId}`;
  
        const response = await fetch(url, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) {
          const detail = await response.text();
          return res.status(500).json({ error: "Failed to fetch products", detail });
        }
  
        const { products = [] } = await response.json();
        
        if (products.length === 0) break;
  
        // Count products with pending or no HS status
        products.forEach(product => {
          const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
          const hasHSStatus = tags.some(tag => tag.startsWith('hs_status_'));
          const isPending = tags.some(tag => tag === 'hs_status_pending');
          
          if (!hasHSStatus || isPending) {
            pendingCount++;
          }
        });
  
        sinceId = products[products.length - 1].id;
        if (products.length < limit) break;
      }
  
      return res.status(200).json({ count: pendingCount });
    } catch (err) {
      console.error("Error in getPendingReviewCount:", err);
      return res.status(500).json({ error: err.message || "Unexpected server error" });
    }
  }
  
  export async function getAutoClassifiedCount(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  
    const { shop, accessToken } = req.body || {};
    if (!shop || !accessToken) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
  
    try {
      const apiVersion = "2025-07";
      let sinceId = null;
      let approvedCount = 0;
      const limit = 250;
  
      while (true) {
        let url = `https://${shop}/admin/api/${apiVersion}/products.json?limit=${limit}`;
        if (sinceId) url += `&since_id=${sinceId}`;
  
        const response = await fetch(url, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) {
          const detail = await response.text();
          return res.status(500).json({ error: "Failed to fetch products", detail });
        }
  
        const { products = [] } = await response.json();
        
        if (products.length === 0) break;
  
        products.forEach(product => {
          const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
          const isApproved = tags.some(tag => tag === 'hs_status_approved');
          
          if (isApproved) {
            approvedCount++;
          }
        });
  
        sinceId = products[products.length - 1].id;
        if (products.length < limit) break;
      }
  
      return res.status(200).json({ count: approvedCount });
    } catch (err) {
      console.error("Error in getAutoClassifiedCount:", err);
      return res.status(500).json({ error: err.message || "Unexpected server error" });
    }
  }
  
  export async function getManualOverridesCount(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  
    const { shop, accessToken } = req.body || {};
    if (!shop || !accessToken) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
  
    try {
      const apiVersion = "2025-07";
      let sinceId = null;
      let modifiedCount = 0;
      const limit = 250;
  
      while (true) {
        let url = `https://${shop}/admin/api/${apiVersion}/products.json?limit=${limit}`;
        if (sinceId) url += `&since_id=${sinceId}`;
  
        const response = await fetch(url, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) {
          const detail = await response.text();
          return res.status(500).json({ error: "Failed to fetch products", detail });
        }
  
        const { products = [] } = await response.json();
        
        if (products.length === 0) break;
  
        products.forEach(product => {
          const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
          const isModified = tags.some(tag => tag === 'hs_status_modified');
          
          if (isModified) {
            modifiedCount++;
          }
        });
  
        sinceId = products[products.length - 1].id;
        if (products.length < limit) break;
      }
  
      return res.status(200).json({ count: modifiedCount });
    } catch (err) {
      console.error("Error in getManualOverridesCount:", err);
      return res.status(500).json({ error: err.message || "Unexpected server error" });
    }
  }
  