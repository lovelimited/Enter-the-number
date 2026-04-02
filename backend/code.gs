/**
 * STUDENT ASSESSMENT SYSTEM - GOOGLE APPS SCRIPT BACKEND
 * จัดทำโดย Google DeepMind Agentic Coding Team
 */

const SUBJECTS = [
  "ภาษาไทย", "คณิตศาสตร์", "วิทยาศาสตร์และเทคโนโลยี", "เศรษฐศาสตร์",
  "ประวัติศาสตร์", "พระพุทธศาสนา", "สุขศึกษาและพลศึกษา", "ศิลปะ",
  "การงานอาชีพ", "ภาษาอังกฤษ", "ภาษาบาลี", "ภาษาอังกฤษเพื่อการสื่อสาร",
  "หน้าที่พลเมือง", "กระทู้ธรรม", "ป้องกันการทุจริต", "คอมพิวเตอร์", "ภูมิศาสตร์", "ล้านนา"
];

// Mapping ชื่อวิชา (frontend) → ชื่อ Sheet จริงใน Google Sheets (รองรับชื่อเก่าและใหม่)
const SUBJECT_SHEET_MAP = {
  "วิทยาศาสตร์และเทคโนโลยี": ["วิทยาศาสตร์และเทคโนโลยี", "วิทยาศาสตร์ชีวภาพและเทคโนโลยี"],
  "ล้านนา": ["ล้านนา"] // จะสร้างใหม่ถ้ายังไม่มี
};

// Helper: หา Sheet ที่ตรงกับชื่อวิชา (รองรับชื่อเก่า/ใหม่)
function getSubjectSheet(ss, subjectName) {
  // 1. ลองหาด้วยชื่อตรงๆ ก่อน
  let sheet = ss.getSheetByName(subjectName);
  if (sheet) return sheet;
  
  // 2. ถ้ามี mapping ลองหาด้วยชื่อทางเลือก
  const alternatives = SUBJECT_SHEET_MAP[subjectName];
  if (alternatives) {
    for (const altName of alternatives) {
      sheet = ss.getSheetByName(altName);
      if (sheet) return sheet;
    }
  }
  
  // 3. ถ้ายังไม่เจอและเป็นวิชาใหม่ (ล้านนา) ให้สร้างใหม่
  if (subjectName === "ล้านนา") {
    return createNewSubjectSheet(ss, "ล้านนา");
  }
  
  return null;
}

// Helper: สร้าง Sheet วิชาใหม่พร้อมโครงสร้าง
function createNewSubjectSheet(ss, subjectName) {
  const sheet = ss.insertSheet(subjectName);
  
  // สร้าง headers ตามมาตรฐาน
  const headers = ["ID", "Name", "Grade", "Room"];
  
  // Characteristics (8 Aspects)
  const charCounts = [3, 2, 3, 3, 3, 2, 2, 2];
  charCounts.forEach((count, idx) => {
    for (let j = 1; j <= count; j++) headers.push(`C${idx + 1}.${j}`);
  });

  // Reading (6 items) + Subject Traits (7 items)
  for (let i = 1; i <= 6; i++) headers.push(`R${i}`);
  for (let i = 1; i <= 7; i++) headers.push(`ST${i}`);

  // Competencies (5 Aspects)
  const compCounts = [3, 2, 3, 2, 2];
  compCounts.forEach((count, idx) => {
    for (let j = 1; j <= count; j++) headers.push(`CM${idx + 1}.${j}`);
  });

  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#f1f5f9").setFontWeight("bold").setHorizontalAlignment("center");
  
  // เพิ่มนักเรียน mock 20 คนต่อชั้น
  const mockData = [];
  GRADES.forEach(grade => {
    for (let s = 1; s <= 20; s++) {
      const row = [`${grade}-${s}`, `นักเรียนคนที่ ${s} (${grade})`, grade, "1"];
      for (let k = 0; k < headers.length - 4; k++) row.push("");
      mockData.push(row);
    }
  });
  
  if (mockData.length > 0) {
    sheet.getRange(2, 1, mockData.length, headers.length).setValues(mockData);
  }
  
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4);
  sheet.setColumnWidths(1, 1, 80);
  sheet.setColumnWidths(2, 1, 200);
  
  return sheet;
}

const GRADES = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];

function doGet(e) {
  // ตรวจสอบความถูกต้องของพารามิเตอร์ที่ส่งมา
  if (!e || !e.parameter) {
    return createJsonResponse({ 
      error: "Invalid Request: ไม่มีพารามิเตอร์ส่งมา",
      tip: "กรุณารันฟังก์ชัน testConnection ใน Editor เพื่อทดสอบสิทธิ์การเข้าถึง"
    });
  }

  const action = e.parameter.action;
  const subject = e.parameter.subject;
  const grade = e.parameter.grade;

  if (action === 'get_data' && subject) {
    return createJsonResponse(getSubjectData(subject));
  }

  if (action === 'get_global_data' && grade) {
    return createJsonResponse(getGlobalStudentAverages(grade));
  }

  if (action === 'get_login_summary') {
    return createJsonResponse(calculateLoginSummary());
  }

  return createJsonResponse({ 
    error: "Invalid Request: คำสั่งไม่ถูกต้องหรือข้อมูลไม่ครบ", 
    received: e.parameter 
  });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return createJsonResponse({ status: "error", error: "Invalid JSON format" });
  }
  
  const action = data.action;
  if (action === 'save_data') {
    saveSubjectData(data.subject, data.rows);
    return createJsonResponse({ status: "success" });
  }

  return createJsonResponse({ error: "Invalid POST Action" });
}

/**
 * GET SUMMARY FOR ALL SUBJECTS & ALL GRADES
 * Used on the Login Screen's Dashboard
 */
function calculateLoginSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  const gradeTotals = {}; // สะสมค่าสำหรับคำนวณค่าเฉลี่ยรวม

  SUBJECTS.forEach(subject => {
    result[subject] = {};
    const sheet = getSubjectSheet(ss, subject);
    if (!sheet) {
      GRADES.forEach(g => result[subject][g] = 0);
      return;
    }

    const values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      GRADES.forEach(g => result[subject][g] = 0);
      return;
    }

    const headers = values[0];
    const cIdx = headers.map((h, i) => h.startsWith('C') && !h.startsWith('CM') ? i : -1).filter(i => i !== -1);
    const rIdx = headers.map((h, i) => h.startsWith('R') || h.startsWith('ST') ? i : -1).filter(i => i !== -1);
    const cmIdx = headers.map((h, i) => h.startsWith('CM') ? i : -1).filter(i => i !== -1);

    GRADES.forEach(grade => {
      const rows = values.slice(1).filter(r => r[2] === grade);
      if (rows.length === 0) {
        result[subject][grade] = 0;
        return;
      }

      let studentsPassing = 0;
      rows.forEach(row => {
        const getSum = (indices) => {
          const scores = indices.map(i => parseFloat(row[i])).filter(v => !isNaN(v));
          return scores.reduce((a, b) => a + b, 0);
        };

        const cSum = getSum(cIdx);
        const rSum = getSum(rIdx);
        const cmSum = getSum(cmIdx);

        // Check if student passes in at least one category (Level 2 or 3)
        // Adjust thresholds manually here to match the frontend
        const passesChar = cSum >= 31; // 31-45=2, 46-60=3
        const passesRead = rSum >= 23; // 23-32=2, 33-42=3
        const passesComp = cmSum >= 19; // 19-27=2, 28-36=3

        if (passesChar || passesRead || passesComp) {
          studentsPassing++;
        }
      });

      const percent = Math.round((studentsPassing / rows.length) * 100);
      result[subject][grade] = percent;
      
      // สะสมค่าสำหรับคำนวณค่าเฉลี่ยรวม
      if (!gradeTotals[grade]) gradeTotals[grade] = { sum: 0, count: 0 };
      gradeTotals[grade].sum += percent;
      gradeTotals[grade].count++;
    });
  });

  // เพิ่ม key "รวมทุกวิชา" ที่เป็นค่าเฉลี่ยของทุกวิชา
  result["รวมทุกวิชา"] = {};
  GRADES.forEach(grade => {
    if (gradeTotals[grade] && gradeTotals[grade].count > 0) {
      result["รวมทุกวิชา"][grade] = Math.round(gradeTotals[grade].sum / gradeTotals[grade].count);
    } else {
      result["รวมทุกวิชา"][grade] = 0;
    }
  });

  return result;
}

/**
 * -------------------------------------------------------------------------
 * ฟังก์ชันสำหรับกดทดสอบใน Apps Script Editor
 * ช่วยในการยืนยันสิทธิ์ (Authorize) โดยไม่เกิดข้อผิดพลาด undefined
 * -------------------------------------------------------------------------
 */
function testConnection() {
  const mockE = { 
    parameter: { 
      action: 'get_data', 
      subject: 'ภาษาไทย' 
    } 
  };
  try {
    const result = doGet(mockE);
    Logger.log("--- ผลการทดสอบการเชื่อมต่อ ---");
    Logger.log(result.getContent());
    Logger.log("---------------------------");
    Logger.log("✅ การเชื่อมต่อระบบพร้อมใช้งาน!");
    Logger.log("ขั้นตอนถัดไป: กด 'Deploy' > 'New Deployment' เลือก 'Anyone' และนำ URL ไปใส่ใน api.js นะครับ");
  } catch (err) {
    Logger.log("❌ พบข้อผิดพลาด: " + err.message);
  }
}

/**
 * AGGREGATE DATA FOR MATRIX VIEW
 */
function getGlobalStudentAverages(grade) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const students = {}; 

  SUBJECTS.forEach(subject => {
    const sheet = getSubjectSheet(ss, subject);
    if (!sheet) return;

    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return; 

    const headers = values[0];
    const rows = values.slice(1).filter(r => r[2] === grade);

    rows.forEach(row => {
      const id = row[0];
      if (!students[id]) {
        students[id] = { ID: id, Name: row[1], Grade: grade, Room: row[3], Subjects: {} };
      }

      const cIndices = headers.map((h, i) => h.startsWith('C') && !h.startsWith('CM') ? i : -1).filter(i => i !== -1);
      const rIndices = headers.map((h, i) => h.startsWith('R') || h.startsWith('ST') ? i : -1).filter(i => i !== -1);
      const cmIndices = headers.map((h, i) => h.startsWith('CM') ? i : -1).filter(i => i !== -1);

      const getSum = (indices) => {
        const scores = indices.map(i => parseFloat(row[i])).filter(v => !isNaN(v));
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) : 0;
      };

      const cSum = getSum(cIndices);
      const rSum = getSum(rIndices);
      const cmSum = getSum(cmIndices);

      const getLevel = (sum, type) => {
        if (sum === 0) return "";
        if (type === 'C') { 
          if (sum < 16) return "0"; if (sum < 31) return "1"; if (sum < 46) return "2"; return "3";
        }
        if (type === 'R') { 
          if (sum < 14) return "0"; if (sum <= 22) return "1"; if (sum <= 32) return "2"; return "3";
        }
        if (type === 'CM') { 
          if (sum < 10) return "0"; if (sum < 19) return "1"; if (sum < 28) return "2"; return "3";
        }
        return "";
      };

      students[id].Subjects[subject] = {
        CLevel: getLevel(cSum, 'C'),
        RLevel: getLevel(rSum, 'R'),
        CMLevel: getLevel(cmSum, 'CM')
      };
    });
  });

  return Object.values(students);
}

function getSubjectData(subjectName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSubjectSheet(ss, subjectName);
  if (!sheet) return { error: "Sheet '" + subjectName + "' not found. กรุณารันฟังก์ชัน initializeSheets ก่อน" };

  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return { subject: subjectName, students: [] };
  
  const headers = values[0];
  const rows = values.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  return { subject: subjectName, students: rows };
}

function saveSubjectData(subjectName, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSubjectSheet(ss, subjectName);
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  const dataToUpload = rows.map(row => headers.map(h => row[h] || ""));
  sheet.getRange(2, 1, dataToUpload.length, headers.length).setValues(dataToUpload);
}

/**
 * INITIALIZE ALL SHEETS WITH HEADERS AND MOCK STUDENTS
 * Run this function ONCE in Apps Script Editor.
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  SUBJECTS.forEach(subject => {
    let sheet = ss.getSheetByName(subject);
    if (!sheet) {
      sheet = ss.insertSheet(subject);
    }
    
    // 1. INFO HEADERS
    const headers = ["ID", "Name", "Grade", "Room"];
    
    // 2. CHARACTERISTICS (8 Aspects)
    const charCounts = [3, 2, 3, 3, 3, 2, 2, 2];
    charCounts.forEach((count, idx) => {
      for (let j = 1; j <= count; j++) headers.push(`C${idx + 1}.${j}`);
    });

    // 3. READING (6 items) + SUBJECT TRAITS (7 items)
    for (let i = 1; i <= 6; i++) headers.push(`R${i}`);
    for (let i = 1; i <= 7; i++) headers.push(`ST${i}`);

    // 4. COMPETENCIES (5 Aspects)
    const compCounts = [3, 2, 3, 2, 2];
    compCounts.forEach((count, idx) => {
      for (let j = 1; j <= count; j++) headers.push(`CM${idx + 1}.${j}`);
    });

    sheet.clear();
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#f1f5f9").setFontWeight("bold").setHorizontalAlignment("center");

    // 5. ADD 20 MOCK STUDENTS PER GRADE
    const mockData = [];
    GRADES.forEach(grade => {
      for (let s = 1; s <= 20; s++) {
        const row = [`${grade}-${s}`, `นักเรียนคนที่ ${s} (${grade})`, grade, "1"];
        for (let k = 0; k < headers.length - 4; k++) row.push(""); 
        mockData.push(row);
      }
    });
    
    sheet.getRange(2, 1, mockData.length, headers.length).setValues(mockData);
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);
    
    sheet.setColumnWidths(1, 1, 80);
    sheet.setColumnWidths(2, 1, 200);
  });

  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1) ss.deleteSheet(sheet1);
}
