import express from 'express';
import getAllProducts, { createProduct, deleteProduct, getProductID, getProducts, updateProductID, updateProductMetadata } from '../../controllers/shopify/productController.js';
import { getShopInfo } from '../../controllers/shopify/shopInfoController.js';
import { createImage, deleteImage, getAllImages, getImageID, getImages, updateImageID } from '../../controllers/shopify/imageController.js';
import { getPendingReviewCount, getAutoClassifiedCount, getManualOverridesCount } from '../../controllers/shopify/hs_codeController.js';
import { getLandedCostHistory, getLandedCostStats, saveLandedCostCalculation } from '../../controllers/shopify/landedCostController.js';


const router = express.Router();

router.post('/products', getProducts);
router.post('/shop-info', getShopInfo);
router.post('/getAllProducts', getAllProducts)
router.post('/getProductID', getProductID)
router.post('/updateProductID', updateProductID)
router.post('/createProduct',createProduct)
router.post('/deleteProduct',deleteProduct)

router.post('/products/metadata', updateProductMetadata)



router.post("/images/list", getImages);       
router.post("/images/all", getAllImages);     
router.post("/image/get", getImageID);        
router.post("/image/create", createImage);    
router.post("/image/update", updateImageID);  
router.post("/image/delete", deleteImage);    




router.post('/PendingReview', getPendingReviewCount)
router.post('/AutoClassified', getAutoClassifiedCount)
router.post('/ManualOverrides', getManualOverridesCount)


router.post('/landed-cost/save', saveLandedCostCalculation);
router.post('/landed-cost/history', getLandedCostHistory);
router.post('/landed-cost/stats', getLandedCostStats);

export default router;
