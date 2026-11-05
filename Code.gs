/* ==========================================================================
   SDIT ANNISA - MASTER GOOGLE APPS SCRIPT (CODE.GS)
   DATABASE CLOUD ONLINE GOOGLE SHEETS & AUTO-STORE FOTO/FILE GOOGLE DRIVE
   ========================================================================== */

// ID Folder Google Drive Default (Bisa diganti atau diatur dinamis dari Web)
var DEFAULT_DRIVE_FOLDER_ID = "1Z9Bil6yyiagMaVrHdclEeR-qyDg9HUfT";
var DEFAULT_SPREADSHEET_ID = "1_UcK3thUuQt7YwIVrKS4Rp1zvEUfdh-Y_UNJ05lphRw";

/**
 * 🟢 GET REQUEST: MEMBACA SELURUH DATA DATABASE DARI TABS SPREADSHEET
 */
function doGet(e) {
  try {
    var ss = null;
    var targetSpreadsheetId = (e && e.parameter && e.parameter.spreadsheetId) ? e.parameter.spreadsheetId : DEFAULT_SPREADSHEET_ID;
    if (targetSpreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(targetSpreadsheetId);
      } catch (err) {}
    }
    if (!ss) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    var db = {};
    var sheets = ss.getSheets();
    sheets.forEach(function(sheet) {
      var name = sheet.getName();
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var headers = data[0];
        var rows = [];
        for (var i = 1; i < data.length; i++) {
          var rowObj = {};
          var isEmpty = true;
          for (var j = 0; j < headers.length; j++) {
            var val = data[i][j];
            if (val instanceof Date) {
              val = Utilities.formatDate(val, Session.getScriptTimeZone() || "Asia/Jakarta", "yyyy-MM-dd");
            }
            if (val !== "" && val !== null && val !== undefined) {
              isEmpty = false;
            }
            rowObj[headers[j]] = val !== undefined ? val : "";
          }
          if (!isEmpty) {
            rows.push(rowObj);
          }
        }
        db[name] = rows;
      } else {
        db[name] = [];
      }
    });

    return ContentService.createTextOutput(JSON.stringify(db))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 🔴 POST REQUEST: 
 * 1. UNGGAH & SIMPAN FOTO/DOKUMEN KE GOOGLE DRIVE FOLDER
 * 2. SYNC & SIMPAN DATA KE SPREADSHEET TABS SERTA LINK GOOGLE DRIVE
 */
function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);

    // =========================================================================
    // FITUR 1: SIMPAN FOTO/FILE KE FOLDER GOOGLE DRIVE & HADIRKAN LINK RESMI
    // =========================================================================
    if (contents.action === "uploadFile") {
      // Menggunakan folder ID yang dikirim dari Web App, jika kosong gunakan default
      var targetFolderId = contents.folderId || DEFAULT_DRIVE_FOLDER_ID;
      var folder;
      try {
        folder = DriveApp.getFolderById(targetFolderId);
      } catch (fErr) {
        folder = DriveApp.getRootFolder();
      }

      var blob = Utilities.newBlob(
        Utilities.base64Decode(contents.base64Data),
        contents.mimeType,
        contents.fileName
      );
      
      // Simpan file fisik secara otomatis ke dalam folder Google Drive Anda
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var fileId = file.getId();
      
      // 🔗 LINK RESMI GOOGLE DRIVE UNTUK SEL DATABASE SPREADSHEET
      var driveLink = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
      
      // 🖼️ LINK PRATINJAU GAMBAR UNTUK APLIKASI WEB
      var fileUrl = "https://lh3.googleusercontent.com/d/" + fileId;

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        fileId: fileId,
        fileUrl: driveLink,
        directUrl: fileUrl,
        driveLink: driveLink,
        fileName: contents.fileName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // FITUR 2: HAPUS FILE DARI GOOGLE DRIVE JIKA DIHAPUS DARI APLIKASI
    // =========================================================================
    if (contents.action === "deleteById" && contents.fileId) {
      try {
        var fileToTrash = DriveApp.getFileById(contents.fileId);
        if (fileToTrash) fileToTrash.setTrashed(true);
      } catch (dErr) {}
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "File berhasil dihapus"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // FITUR 3: SYNC DATABASE LENGKAP & LINK FOTO KE GOOGLE SPREADSHEET TABS
    // =========================================================================
    var ss = null;
    var targetSpreadsheetId = contents.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    if (targetSpreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(targetSpreadsheetId);
      } catch (sErr) {}
    }
    if (!ss) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    for (var key in contents) {
      if (contents.hasOwnProperty(key) && Array.isArray(contents[key])) {
        if (key === "spreadsheetId" || key === "spreadsheetUrl" || key === "driveFolderId") continue;

        var sheet = ss.getSheetByName(key);
        if (!sheet) {
          sheet = ss.insertSheet(key);
        }
        sheet.clear();

        var rows = contents[key];
        if (rows.length > 0) {
          var headers = Object.keys(rows[0]);
          var dataToStore = [headers];

          rows.forEach(function(row) {
            var rowData = [];
            headers.forEach(function(header) {
              var val = row[header] !== undefined && row[header] !== null ? row[header] : "";
              if (Array.isArray(val)) {
                val = val.join(", ");
              }
              rowData.push(val);
            });
            dataToStore.push(rowData);
          });

          sheet.getRange(1, 1, dataToStore.length, headers.length).setValues(dataToStore);

          // Format Header Baris 1: Tebal & Warna Hijau Emerald
          sheet.getRange(1, 1, 1, headers.length)
            .setFontWeight("bold")
            .setBackground("#0f5132")
            .setFontColor("#ffffff");
          sheet.setFrozenRows(1);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Seluruh foto, file dokumen, dan database berhasil tersimpan di Cloud!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

