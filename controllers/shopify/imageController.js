const API_VERSION = "2025-07";

function dataUrlToAttachment(src) {
  return src.startsWith("data:") ? src.split(",")[1] : src;
}

export const getImages = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { shop, accessToken, productId, limit = 5 } = req.body || {};
  if (!shop || !accessToken || !productId) {
    return res
      .status(400)
      .json({ error: "Missing shop, accessToken or productId" });
  }

  try {
    const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images.json?limit=${limit}`;
    const r = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return res.status(200).json(data); // { images: [...] }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch images" });
  }
};

export async function getAllImages(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { shop, accessToken, productId } = req.body || {};
  if (!shop || !accessToken || !productId) {
    return res
      .status(400)
      .json({ error: "Missing shop, accessToken or productId" });
  }

  try {
    const limit = 250;
    let sinceId = null;
    const allImages = [];

    while (true) {
      const url =
        `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images.json` +
        `?limit=${limit}` +
        (sinceId ? `&since_id=${sinceId}` : "");

      const r = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });
      if (!r.ok) throw new Error(await r.text());

      const { images = [] } = await r.json();
      if (images.length === 0) break;

      allImages.push(...images);
      sinceId = images[images.length - 1].id;
      if (images.length < limit) break;
    }

    return res.status(200).json({ images: allImages, count: allImages.length });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch images" });
  }
}


export async function getImageID(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { shop, accessToken, productId, imageId } = req.body || {};
  if (!shop || !accessToken || !productId || !imageId) {
    return res.status(400).json({
      error:
        "Missing required parameters (shop, accessToken, productId, imageId)",
    });
  }

  try {
    const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images/${imageId}.json`;
    const r = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return res.status(200).json(data); // { image: {...} }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err.message || "Unexpected server error" });
  }
}

export async function updateImageID(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { shop, accessToken, productId, imageId, imageData } = req.body || {};
  if (!shop || !accessToken || !productId || !imageId || !imageData) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // normalise potential data:url into attachment
  const patched = { ...imageData };
  if (patched.src && patched.src.startsWith("data:")) {
    patched.attachment = dataUrlToAttachment(patched.src);
    delete patched.src;
  }

  try {
    const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images/${imageId}.json`;
    const r = await fetch(url, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: { id: imageId, ...patched } }),
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return res.status(200).json(data); // { image: {...} }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err.message || "Unexpected server error" });
  }
}

export async function createImage(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { shop, accessToken, productId, imageData } = req.body || {};
  if (!shop || !accessToken || !productId || !imageData) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const patched = { ...imageData };
  if (patched.src && patched.src.startsWith("data:")) {
    patched.attachment = dataUrlToAttachment(patched.src);
    delete patched.src;
  }

  try {
    const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images.json`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: patched }),
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return res.status(200).json(data); // { image: {...} }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err.message || "Unexpected server error" });
  }
}

export async function deleteImage(req, res) {
  if (req.method !== "DELETE" && req.method !== "POST") {
    res.setHeader("Allow", ["DELETE", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { shop, accessToken, productId, imageId } =
    req.method === "DELETE" ? req.query : req.body;
  if (!shop || !accessToken || !productId || !imageId) {
    return res
      .status(400)
      .json({ error: "Missing shop, accessToken, productId or imageId" });
  }

  try {
    const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}/images/${imageId}.json`;
    const r = await fetch(url, {
      method: "DELETE",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });
    if (r.status === 200) return res.status(200).json({ success: true });
    throw new Error(await r.text());
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err.message || "Unexpected server error" });
  }
}
