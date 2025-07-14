

// import express from 'express';
// import { 
//   mockLandedCostCalculation, 
//   getDutifyLandedCostHistory,
//   getDutifyLandedCostStats,
//   getDutifyLandedCostById,
//   calculateLandedCost
// } from '../../controllers/dutify/landedCostController.js';
// import { 
//   detectHSCode, 
//   detectProductHSCode,
//   getHSCodeHistory, 
//   saveProductHSCode 
// } from '../../controllers/dutify/HScodeController.js';

// const router = express.Router();

// //router.post('/landed-cost/calculate', mockLandedCostCalculation);
// router.post('/landed-cost/history', getDutifyLandedCostHistory);
// router.post('/landed-cost/stats', getDutifyLandedCostStats);
// router.post('/landed-cost/get', getDutifyLandedCostById);
// router.post('/landed-cost/calculate', calculateLandedCost);

// // HS Code routes
// router.post('/hs-code/detect', detectHSCode);
// router.post('/hs-code/detectProduct', detectProductHSCode);
// router.post('/hs-code/history', getHSCodeHistory);
// router.post('/hs-code/save', saveProductHSCode);
// //router.post('/hs-code/pending', getPendingHSCodes);


// export default router;


import express from 'express';
import { 
  mockLandedCostCalculation, 
  getDutifyLandedCostHistory,
  getDutifyLandedCostStats,
  getDutifyLandedCostById,
  calculateLandedCost,
  searchApprovedModifiedProducts
} from '../../controllers/dutify/landedCostController.js';
import { 
  detectHSCode, 
  detectProductHSCode,
  getHSCodeHistory, 
  saveProductHSCode,
} from '../../controllers/dutify/HScodeController.js';

const router = express.Router();

//router.post('/landed-cost/calculate', mockLandedCostCalculation);
router.post('/landed-cost/history', getDutifyLandedCostHistory);
router.post('/landed-cost/stats', getDutifyLandedCostStats);
router.post('/landed-cost/get', getDutifyLandedCostById);
router.post('/landed-cost/calculate', calculateLandedCost);
router.post('/products/search', searchApprovedModifiedProducts);



// HS Code routes
router.post('/hs-code/detect', detectHSCode);
router.post('/hs-code/detectProduct', detectProductHSCode);
router.post('/hs-code/history', getHSCodeHistory);
router.post('/hs-code/save', saveProductHSCode);

export default router;
