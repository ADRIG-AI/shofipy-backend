import express from 'express';
import getAllProducts, { createProduct, deleteProduct, getProductID, getProducts, updateProductID } from '../../controllers/shopify/productController.js';
import { getShopInfo } from '../../controllers/shopify/shopInfoController.js';
import {
    getProductImages,
    getProductImage,
    createProductImage,
    updateProductImage,
    deleteProductImage,
  } from "../../controllers/shopify/imageController.js";


const router = express.Router();

router.post('/products', getProducts);
router.post('/shop-info', getShopInfo);
router.post('/getAllProducts', getAllProducts)
router.post('/getProductID', getProductID)
router.post('/updateProductID', updateProductID)
router.post('/createProduct',createProduct)
router.post('/deleteProduct',deleteProduct)



router.post("/shopify/images", getProductImages);   // list
router.get("/shopify/images", getProductImages);    // list
router.post("/shopify/image", getProductImage);     // single
router.get("/shopify/image", getProductImage);      // single
router.post("/shopify/image/create", createProductImage);
router.post("/shopify/image/update", updateProductImage);
router.put("/shopify/image/update", updateProductImage);
router.delete("/shopify/image/delete", deleteProductImage);
router.post("/shopify/image/delete", deleteProductImage);

export default router;
