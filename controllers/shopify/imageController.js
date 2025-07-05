
const API_VERSION = "2025-07";

const jsonHeaders = (token) => ({
  "X-Shopify-Access-Token": token,
  "Content-Type": "application/json",
  Accept: "application/json",
});

async function getProductImages(req, res) {
  if (!allow(req, res, ["GET", "POST"])) return;
  const { shop, accessToken, productId } =
    req.method === "GET" ? req.query : req.body;

  if (!shop || !accessToken || !productId) {
    return res.status(400).json({ error: "Missing shop, accessToken or productId" });
  }

  const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images.json`;

  try {
    const r = await fetch(url, { headers: jsonHeaders(accessToken) });
    const data = await r.json();
    return r.ok ? res.status(200).json(data) : res.status(r.status).json({ error: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getProductImage(req, res) {
  if (!allow(req, res, ["GET", "POST"])) return;
  const { shop, accessToken, productId, imageId } =
    req.method === "GET" ? req.query : req.body;

  if (!shop || !accessToken || !productId || !imageId) {
    return res
      .status(400)
      .json({ error: "Missing shop, accessToken, productId or imageId" });
  }

  const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images/${imageId}.json`;

  try {
    const r = await fetch(url, { headers: jsonHeaders(accessToken) });
    const data = await r.json();
    return r.ok ? res.status(200).json(data) : res.status(r.status).json({ error: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createProductImage(req, res) {
  if (!allow(req, res, ["POST"])) return;

  const {
    shop,
    accessToken,
    productId,
    src,
    attachment: rawAttachment,
    alt,
    position,
    variant_ids,
  } = req.body || {};

  if (!shop || !accessToken || !productId) {
    return res.status(400).json({ error: "Missing shop, accessToken or productId" });
  }
  if (!src && !rawAttachment) {
    return res.status(400).json({ error: "Provide either src or attachment" });
  }

 
  let attachment = rawAttachment;
  if (attachment) {
    const b64 = attachment.replace(/^data:image\/\w+;base64,/, "");
    const sizeInBytes = (b64.length * 3) / 4; // rough
    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    if (sizeInBytes > MAX_SIZE) {
      return res.status(413).json({ error: "Attachment exceeds 20 MB limit" });
    }
    attachment = b64;
  }

  const image = { src, attachment, alt, position, variant_ids };
  Object.keys(image).forEach((k) => image[k] === undefined && delete image[k]);

  const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images.json`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify({ image }),
    });
    const data = await r.json();
    return r.ok ? res.status(200).json(data) : res.status(r.status).json({ error: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function updateProductImage(req, res) {
  if (!allow(req, res, ["POST", "PUT"])) return;

  const {
    shop,
    accessToken,
    productId,
    imageId,
    src,
    attachment: rawAttachment,
    alt,
    position,
    variant_ids,
  } = req.body || {};

  if (!shop || !accessToken || !productId || !imageId) {
    return res
      .status(400)
      .json({ error: "Missing shop, accessToken, productId or imageId" });
  }

  let attachment = rawAttachment;
  if (attachment) {
    attachment = attachment.replace(/^data:image\/\w+;base64,/, "");
  }

  const image = { id: imageId, src, attachment, alt, position, variant_ids };
  Object.keys(image).forEach((k) => image[k] === undefined && delete image[k]);

  const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images/${imageId}.json`;

  try {
    const r = await fetch(url, {
      method: "PUT",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify({ image }),
    });
    const data = await r.json();
    return r.ok ? res.status(200).json(data) : res.status(r.status).json({ error: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteProductImage(req, res) {
  if (!allow(req, res, ["DELETE", "POST"])) return;
  const { shop, accessToken, productId, imageId } =
    req.method === "DELETE" ? req.query : req.body;

  if (!shop || !accessToken || !productId || !imageId) {
    return res
      .status(400)
      .json({ error: "Missing shop, accessToken, productId or imageId" });
  }

  const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images/${imageId}.json`;

  try {
    const r = await fetch(url, { method: "DELETE", headers: jsonHeaders(accessToken) });
    if (r.ok) return res.status(200).json({ success: true });
    const detail = await r.text();
    return res.status(r.status).json({ error: detail || "Failed to delete image" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


function allow(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return false;
  }
  return true;
}


export {
  getProductImages,
  getProductImage,
  createProductImage,
  updateProductImage,
  deleteProductImage,
};
