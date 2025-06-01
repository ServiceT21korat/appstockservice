// Code.gs - Google Apps Script for Material Requisition System

// Set up web app to handle POST requests from the form
function doPost(e) {
  try {
    // Open the spreadsheet using the provided ID
    const ss = SpreadsheetApp.openById('1ZjLX7Rwbsn9MC6PkJLvx0qE-3DylsxHAfXOPRYjcFqU');
    
    // Get the StockData sheet for recording transactions
    const stockDataSheet = ss.getSheetByName('StockData');
    if (!stockDataSheet) {
      // Create the sheet if it doesn't exist
      stockDataSheet = ss.insertSheet('StockData');
      stockDataSheet.appendRow(['วันที่', 'รหัสวัสดุ', 'ชื่อวัสดุ', 'จำนวนในสต๊อก', 'จำนวนที่เบิก', 'จำนวนคงเหลือ']);
    }
    
    // Get form data
    const materialCode = e.parameter.materialCode;
    const materialName = e.parameter.materialName;
    const stockQuantity = parseInt(e.parameter.stockQuantity);
    const requestQuantity = parseInt(e.parameter.requestQuantity);
    const remainingQuantity = parseInt(e.parameter.remainingQuantity);
    
    // Add timestamp
    const timestamp = new Date();
    
    // Append data to StockData sheet (transaction log)
    stockDataSheet.appendRow([
      timestamp,
      materialCode,
      materialName,
      stockQuantity,
      requestQuantity,
      remainingQuantity
    ]);
    
    // Update the inventory with new quantity
    updateInventory(materialCode, remainingQuantity);
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'success',
      'message': 'บันทึกข้อมูลเรียบร้อยแล้ว'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'error',
      'error': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to update inventory stock quantity
function updateInventory(materialCode, newQuantity) {
  try {
    const ss = SpreadsheetApp.openById('1ZjLX7Rwbsn9MC6PkJLvx0qE-3DylsxHAfXOPRYjcFqU');
    
    // Get or create the Inventory sheet
    let inventorySheet = ss.getSheetByName('Inventory');
    if (!inventorySheet) {
      // If sheet doesn't exist, create it and initialize with sample data
      initializeInventoryData();
      inventorySheet = ss.getSheetByName('Inventory');
    }
    
    // Find the row with the material code
    const data = inventorySheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {  // Start from 1 to skip header row
      if (data[i][0] === materialCode) {  // Assuming material code is in column A (index 0)
        // Update the stock quantity (assuming it's in column C (index 2))
        inventorySheet.getRange(i + 1, 3).setValue(newQuantity);
        break;
      }
    }
  } catch(error) {
    Logger.log('Error updating inventory: ' + error.toString());
    throw error;
  }
}

// Function to handle GET requests - returns all inventory data as JSON
function doGet(e) {
  try {
    // If a specific action is requested
    if (e && e.parameter && e.parameter.action) {
      
      // Return low stock items (10 or fewer)
      if (e.parameter.action === 'getLowStock') {
        const lowStockItems = getLowStockItems();
        return ContentService.createTextOutput(JSON.stringify({
          'result': 'success',
          'data': lowStockItems
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Return recent transactions
      if (e.parameter.action === 'getRecentTransactions') {
        const recentTransactions = getRecentTransactions();
        return ContentService.createTextOutput(JSON.stringify({
          'result': 'success',
          'data': recentTransactions
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Search for a specific material
      if (e.parameter.action === 'searchMaterial' && e.parameter.code) {
        const material = searchMaterial(e.parameter.code);
        return ContentService.createTextOutput(JSON.stringify({
          'result': 'success',
          'data': material
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Default: return all inventory data
    const inventoryData = getAllInventory();
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'success',
      'data': inventoryData
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'error',
      'error': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all inventory items
function getAllInventory() {
  const ss = SpreadsheetApp.openById('1ZjLX7Rwbsn9MC6PkJLvx0qE-3DylsxHAfXOPRYjcFqU');
  
  // Get or create the Inventory sheet
  let inventorySheet = ss.getSheetByName('Inventory');
  if (!inventorySheet) {
    // If sheet doesn't exist, create it and initialize with sample data
    initializeInventoryData();
    inventorySheet = ss.getSheetByName('Inventory');
  }
  
  // Get all data
  const data = inventorySheet.getDataRange().getValues();
  const headers = data[0];
  const items = [];
  
  // Convert to array of objects
  for (let i = 1; i < data.length; i++) {
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = data[i][j];
    }
    items.push(item);
  }
  
  return items;
}

// Get low stock items (10 or fewer)
function getLowStockItems() {
  const allItems = getAllInventory();
  return allItems
    .filter(item => item['จำนวนในสต๊อก'] <= 10)
    .sort((a, b) => a['จำนวนในสต๊อก'] - b['จำนวนในสต๊อก'])
    .slice(0, 5); // Return only top 5 lowest stock items
}

// Get recent transactions
function getRecentTransactions() {
  const ss = SpreadsheetApp.openById('1ZjLX7Rwbsn9MC6PkJLvx0qE-3DylsxHAfXOPRYjcFqU');
  
  // Get the StockData sheet
  const stockDataSheet = ss.getSheetByName('StockData');
  if (!stockDataSheet || stockDataSheet.getLastRow() <= 1) {
    return []; // No transactions yet
  }
  
  // Get all data
  const data = stockDataSheet.getDataRange().getValues();
  const headers = data[0];
  const transactions = [];
  
  // Convert to array of objects (most recent first)
  for (let i = data.length - 1; i > 0; i--) {
    const transaction = {};
    for (let j = 0; j < headers.length; j++) {
      transaction[headers[j]] = data[i][j];
    }
    transactions.push(transaction);
    
    // Only return the 5 most recent transactions
    if (transactions.length >= 5) break;
  }
  
  return transactions;
}

// Search for a specific material by code
function searchMaterial(code) {
  const allItems = getAllInventory();
  return allItems.find(item => item['รหัสวัสดุ'] === code) || null;
}

// Function to initialize the inventory data with sample items
function initializeInventoryData() {
  const ss = SpreadsheetApp.openById('1ZjLX7Rwbsn9MC6PkJLvx0qE-3DylsxHAfXOPRYjcFqU');
  
  // Create Inventory sheet if it doesn't exist
  let inventorySheet = ss.getSheetByName('Inventory');
  if (!inventorySheet) {
    inventorySheet = ss.insertSheet('Inventory');
    
    // Add headers
    inventorySheet.appendRow(['รหัสวัสดุ', 'ชื่อวัสดุ', 'จำนวนในสต๊อก']);
  }
  
  // Create StockData sheet if it doesn't exist
  let stockDataSheet = ss.getSheetByName('StockData');
  if (!stockDataSheet) {
    stockDataSheet = ss.insertSheet('StockData');
    
    // Add headers
    stockDataSheet.appendRow(['วันที่', 'รหัสวัสดุ', 'ชื่อวัสดุ', 'จำนวนในสต๊อก', 'จำนวนที่เบิก', 'จำนวนคงเหลือ']);
  }
  
  // Clear existing data in Inventory (except headers)
  if (inventorySheet.getLastRow() > 1) {
    inventorySheet.deleteRows(2, inventorySheet.getLastRow() - 1);
  }
  
  // Sample data - 20 items as requested
  const sampleData = [
    { materialCode: "M001", materialName: "กระดาษ A4", stockQuantity: 8 },
    { materialCode: "M002", materialName: "ปากกาลูกลื่น", stockQuantity: 15 },
    { materialCode: "M003", materialName: "ดินสอ 2B", stockQuantity: 5 },
    { materialCode: "M004", materialName: "ยางลบ", stockQuantity: 10 },
    { materialCode: "M005", materialName: "ลวดเย็บกระดาษ", stockQuantity: 3 },
    { materialCode: "M006", materialName: "คลิปหนีบกระดาษ", stockQuantity: 20 },
    { materialCode: "M007", materialName: "แฟ้มเอกสาร", stockQuantity: 7 },
    { materialCode: "M008", materialName: "เทปกาว", stockQuantity: 9 },
    { materialCode: "M009", materialName: "กรรไกร", stockQuantity: 12 },
    { materialCode: "M010", materialName: "คัตเตอร์", stockQuantity: 6 },
    { materialCode: "M011", materialName: "สมุดโน้ต", stockQuantity: 25 },
    { materialCode: "M012", materialName: "กระดาษโน้ต", stockQuantity: 18 },
    { materialCode: "M013", materialName: "แฟ้มซอง", stockQuantity: 4 },
    { materialCode: "M014", materialName: "ที่เจาะกระดาษ", stockQuantity: 8 },
    { materialCode: "M015", materialName: "ที่เย็บกระดาษ", stockQuantity: 14 },
    { materialCode: "M016", materialName: "ปากกาเน้นข้อความ", stockQuantity: 9 },
    { materialCode: "M017", materialName: "กระดาษการ์ด", stockQuantity: 30 },
    { materialCode: "M018", materialName: "ซองจดหมาย", stockQuantity: 50 },
    { materialCode: "M019", materialName: "ไม้บรรทัด", stockQuantity: 7 },
    { materialCode: "M020", materialName: "น้ำยาลบคำผิด", stockQuantity: 2 }
  ];
  
  // Add sample data
  sampleData.forEach(item => {
    inventorySheet.appendRow([
      item.materialCode,
      item.materialName,
      item.stockQuantity
    ]);
  });
  
  // Format the sheets for better readability
  inventorySheet.setFrozenRows(1);
  stockDataSheet.setFrozenRows(1);
  
  // Auto-resize columns to fit content
  inventorySheet.autoResizeColumns(1, 3);
  stockDataSheet.autoResizeColumns(1, 6);
}

// Function to reset all data (for testing purposes)
function resetAllData() {
  const ss = SpreadsheetApp.openById('1ZjLX7Rwbsn9MC6PkJLvx0qE-3DylsxHAfXOPRYjcFqU');
  
  // Delete existing sheets
  const inventorySheet = ss.getSheetByName('Inventory');
  if (inventorySheet) {
    ss.deleteSheet(inventorySheet);
  }
  
  const stockDataSheet = ss.getSheetByName('StockData');
  if (stockDataSheet) {
    ss.deleteSheet(stockDataSheet);
  }
  
  // Initialize fresh data
  initializeInventoryData();
  
  return "Data reset complete";
}

// Function to create a web app interface (optional)
function doGetHtml() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ระบบเบิกวัสดุ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}