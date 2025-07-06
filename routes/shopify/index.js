import express from 'express';
import getAllProducts, { createProduct, deleteProduct, getProductID, getProducts, updateProductID } from '../../controllers/shopify/productController.js';
import { getShopInfo } from '../../controllers/shopify/shopInfoController.js';

import { createImage, deleteImage, getAllImages, getImageID, getImages, updateImageID } from '../../controllers/shopify/imageController.js';



const router = express.Router();

router.post('/products', getProducts);
router.post('/shop-info', getShopInfo);
router.post('/getAllProducts', getAllProducts)
router.post('/getProductID', getProductID)
router.post('/updateProductID', updateProductID)
router.post('/createProduct',createProduct)
router.post('/deleteProduct',deleteProduct)



// routes/shopifyImageRoutes.js (or inside your main router)
router.post("/images/list", getImages);       // List multiple images (paginated)
router.post("/images/all", getAllImages);     // List ALL images (with pagination loop)
router.post("/image/get", getImageID);          // Get single image by ID
router.post("/image/create", createImage);    // Create new image
router.post("/image/update", updateImageID);    // Update image (alt, position, etc.)
router.post("/image/delete", deleteImage);    // Delete image by ID


export default router;
