function doGet(e) {
  var ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID'); // <--- ใส่ Spreadsheet ID ของคุณ
  var sheet = ss.getSheetByName('Inventory');
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    result.push({
      materialCode: data[i][0],
      materialName: data[i][1],
      stockQuantity: Number(data[i][2])
    });
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID'); // <--- ใส่ Spreadsheet ID ของคุณ
    var inventorySheet = ss.getSheetByName('Inventory');
    var logSheet = ss.getSheetByName('StockData') || ss.insertSheet('StockData');

    // รับข้อมูลจากฟอร์ม
    var code = e.parameter.materialCode;
    var name = e.parameter.materialName;
    var stockQty = Number(e.parameter.stockQuantity);
    var requestQty = Number(e.parameter.requestQuantity);
    var remainQty = Number(e.parameter.remainingQuantity);
    var jobNumber = e.parameter.jobNumber || "";

    // อัปเดตจำนวนคงเหลือใน Inventory
    var data = inventorySheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == code) {
        inventorySheet.getRange(i + 1, 3).setValue(remainQty);
        break;
      }
    }

    // เพิ่มข้อมูลใหม่ใน StockData log (ถ้ายังไม่มี header ให้เพิ่ม)
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow([
        'วันที่', 'รหัสวัสดุ', 'ชื่อวัสดุ', 'จำนวนในสต๊อก', 'จำนวนที่เบิก', 'จำนวนคงเหลือ', 'เลขที่ใบงาน'
      ]);
    }
    logSheet.appendRow([
      new Date(), code, name, stockQty, requestQty, remainQty, jobNumber
    ]);

    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
