function doGet(e) {
  var ss = SpreadsheetApp.openById('14XwCMLNYYllVSRdl1jqzU48H2ilFbAFgFuhbtuKHLbc'); // Spreadsheet ID
  var sheetNames = [ "ไฟฟ้า", "สุขาภิบาล", "แอร์", "สนับสนุนการตลาด", "เบ็ดเตล็ด"]; // เพิ่มชื่อชีตตรงนี้
  var result = [];
  for (var s = 0; s < sheetNames.length; s++) {
    var sheet = ss.getSheetByName(sheetNames[s]);
    if (!sheet) continue;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      result.push({
        materialCode: data[i][0],
        materialName: data[i][1],
        stockQuantity: Number(data[i][2])
      });
    }
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById('14XwCMLNYYllVSRdl1jqzU48H2ilFbAFgFuhbtuKHLbc');
    var sheetNames = ["ไฟฟ้า", "สุขาภิบาล", "แอร์", "สนับสนุนการตลาด", "เบ็ดเตล็ด"];
    var code = e.parameter.materialCode;
    var name = e.parameter.materialName;
    var stockQty = Number(e.parameter.stockQuantity);
    var requestQty = Number(e.parameter.requestQuantity);
    var remainQty = Number(e.parameter.remainingQuantity);
    var jobNumber = e.parameter.jobNumber || "";

    var found = false;

    // หาและอัปเดตจำนวนคงเหลือในชีตที่ตรงกับรหัส
    for (var s = 0; s < sheetNames.length; s++) {
      var sheet = ss.getSheetByName(sheetNames[s]);
      if (!sheet) continue;
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == code) {
          sheet.getRange(i + 1, 3).setValue(remainQty); // อัปเดตจำนวนคงเหลือ
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // Log การเบิกใน StockData
    var logSheet = ss.getSheetByName('StockData') || ss.insertSheet('StockData');
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
