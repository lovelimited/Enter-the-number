/**
 * FAST JSON DATABASE BACKEND FOR STUDENT ASSESSMENT SYSTEM
 * จัดทำโดย Google DeepMind Agentic Coding Team
 */

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
//  DATABASE SETUP & MIGRATION
// ============================================================================

const DEFAULT_METRICS = {
  characteristics: {
    title: "คุณลักษณะอันพึงประสงค์ 8 ด้าน",
    prefix: "C",
    aspects: [
      { id: "C1", label: "1. รักชาติ ศาสน์ กษัตริย์", items: ["ภูมิใจในชาติ", "ปฏิบัติตามหลักศาสนา", "จงรักภักดีสถาบัน"] },
      { id: "C2", label: "2. ซื่อสัตย์ สุจริต", items: ["ซื่อสัตย์ต่อตนเอง", "ปฏิบัติตามคำมั่นสัญญา"] },
      { id: "C3", label: "3. มีวินัย", items: ["เข้าเรียนตรงเวลา", "แต่งกายเรียบร้อย", "รับผิดชอบงาน"] },
      { id: "C4", label: "4. ใฝ่เรียนรู้", items: ["แสวงหาความรู้", "ตั้งใจเรียน", "ร่วมกิจกรรมสม่ำเสมอ"] },
      { id: "C5", label: "5. อยู่อย่างพอเพียง", items: ["ประหยัดทรัพย์สิน", "ใช้อุปกรณ์รู้คุณค่า", "มีการเก็บออม"] },
      { id: "C6", label: "6. มุ่งมั่นการทำงาน", items: ["ตั้งใจพยายาม", "เอาใจใส่ต่องาน"] },
      { id: "C7", label: "7. รักความเป็นไทย", items: ["อนุรักษ์วัฒนธรรม", "ร่วมประเพณีไทย"] },
      { id: "C8", label: "8. มีจิตสาธารณะ", items: ["มีน้ำใจช่วยเหลือ", "กิจกรรมส่วนรวม"] }
    ]
  },
  evaluations: {
    title: "การประเมินรายวิชา",
    prefix: "R",
    aspects: [
      { id: "R", label: "อ่าน คิดวิเคราะห์ เขียน", items: ["อ่านออกเสียงถูกต้อง", "แบ่งวรรคตอนรวดเร็ว", "นำเสนอความคิดชัดเจน", "สรุปสาระสำคัญ", "วิเคราะห์วิจารณ์", "เขียนสรุปกระชับ"] },
      { id: "ST", label: "คุณลักษณะของรายวิชา", items: ["สมุดงาน", "แฟ้มสะสมผลงาน", "โครงงาน/กิจกรรม", "แต่งกายเหมาะสมมีระเบียบ ร.ร.", "มีสัมมาคาราวะ", "เวลาเรียน", "การตั้งใจเรียน", "ความรักในรายวิชา"] }
    ]
  },
  competencies: {
    title: "สมรรถนะ 5 ด้าน",
    prefix: "CM",
    aspects: [
      { id: "CM1", label: "1. การสื่อสาร", items: ["รับส่งสาร", "ถ่ายทอดเหมาะสม", "วิธีการเหมาะสม"] },
      { id: "CM2", label: "2. การคิด", "items": ["วิเคราะห์สร้างความรู้", "คิดเป็นระบบ"] },
      { id: "CM3", label: "3. การแก้ปัญหา", "items": ["ใช้เหตุผล", "แสวงหาความรู้", "ตัดสินใจรอบคอบ"] },
      { id: "CM4", label: "4. การใช้ทักษะชีวิต", "items": ["อยู่ร่วมกับผู้อื่น", "แก้ความขัดแย้ง"] },
      { id: "CM5", label: "5. การใช้เทคโนโลยี", "items": ["พัฒนาตนเอง", "ทำงานร่วมผู้อื่น"] }
    ]
  }
};

const DEFAULT_SUBJECTS = [
  "ภาษาไทย", "คณิตศาสตร์", "วิทยาศาสตร์และเทคโนโลยี", "เศรษฐศาสตร์",
  "ประวัติศาสตร์", "พระพุทธศาสนา", "สุขศึกษาและพลศึกษา", "ศิลปะ",
  "การงานอาชีพ", "ภาษาอังกฤษ", "ภาษาบาลี", "ภาษาอังกฤษเพื่อการสื่อสาร",
  "หน้าที่พลเมือง", "กระทู้ธรรม", "ป้องกันการทุจริต", "คอมพิวเตอร์", "ภูมิศาสตร์", "ล้านนา"
];

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. DB_Config
  let configSheet = ss.getSheetByName("DB_Config");
  if (!configSheet) {
    configSheet = ss.insertSheet("DB_Config");
    configSheet.appendRow(["Key", "ValueJSON"]);
    configSheet.appendRow(["metrics", JSON.stringify(DEFAULT_METRICS)]);
    
    // Create default curriculum
    const defaultCurriculum = [];
    DEFAULT_SUBJECTS.forEach((subj, idx) => {
      ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"].forEach(grade => {
        defaultCurriculum.push({ รหัสวิชา: "S" + (idx+1), ชื่อวิชา: subj, ชั้น: grade, เทอม: "เทอม 1" });
        defaultCurriculum.push({ รหัสวิชา: "S" + (idx+1), ชื่อวิชา: subj, ชั้น: grade, เทอม: "เทอม 2" });
      });
    });
    configSheet.appendRow(["curriculum", JSON.stringify(defaultCurriculum)]);
  }

  // 2. Students
  let studentsSheet = ss.getSheetByName("Students") || ss.getSheetByName("DB_Students");
  if (!studentsSheet) {
    studentsSheet = ss.insertSheet("Students");
    studentsSheet.appendRow(["ID", "Name", "Grade", "Room"]);
    const mock = [];
    ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"].forEach(grade => {
      for (let s = 1; s <= 20; s++) {
        mock.push([`${grade}-${s}`, `นักเรียนคนที่ ${s} (${grade})`, grade, "1"]);
      }
    });
    studentsSheet.getRange(2, 1, mock.length, 4).setValues(mock);
  }

  // 3. DB_Scores
  let scoresSheet = ss.getSheetByName("DB_Scores");
  if (!scoresSheet) {
    scoresSheet = ss.insertSheet("DB_Scores");
    scoresSheet.appendRow(["Term", "Subject", "Grade", "ScoresJSON", "SummaryJSON"]);
  }

  return "Database Setup Complete!";
}

// ============================================================================
//  CORE DATA ACCESS
// ============================================================================

function getConfigValue(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_Config");
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      try {
        return JSON.parse(values[i][1]);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

function setConfigValue(key, jsonValue) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_Config");
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const stringified = JSON.stringify(jsonValue);
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 2).setValue(stringified);
  } else {
    sheet.appendRow([key, stringified]);
  }
}

function getStudentsByGrade(grade) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Students") || ss.getSheetByName("DB_Students");
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const students = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i][2] === grade) {
      students.push({
        id: String(values[i][0]), // ensure ID is string
        name: values[i][1],
        grade: values[i][2],
        room: values[i][3]
      });
    }
  }
  return students;
}

// ============================================================================
//  API ENDPOINTS (GET)
// ============================================================================

function doGet(e) {
  if (!e || !e.parameter) {
    return createJsonResponse({ error: "No parameters", hint: "Run setupDatabase() in the editor first." });
  }

  const action = e.parameter.action;

  // 1. GET INIT DATA (Fast initial load)
  if (action === 'get_init_data') {
    const metrics = getConfigValue("metrics") || DEFAULT_METRICS;
    const curriculum = getConfigValue("curriculum") || [];
    
    // Load login summary (from DB_Scores SummaryJSON column)
    const summary = {};
    const scoresSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_Scores");
    if (scoresSheet && scoresSheet.getLastRow() > 1) {
      const values = scoresSheet.getRange(2, 1, scoresSheet.getLastRow()-1, 5).getValues();
      values.forEach(row => {
        const [term, subj, grade, scoresJsonStr, summaryJsonStr] = row;
        const currentTerm = e.parameter.term;
        if (currentTerm && term !== currentTerm) return;

        if (!summary[subj]) summary[subj] = {};
        
        try {
          const sumData = summaryJsonStr ? JSON.parse(summaryJsonStr) : { passedPercent: 0 };
          // If sumData is just a number (legacy), wrap it. Otherwise keep as is.
          if (typeof sumData === 'number') {
            summary[subj][grade] = { passedPercent: sumData };
          } else {
            summary[subj][grade] = {
              passedPercent: sumData.passedPercent || 0,
              isCComplete: sumData.isCComplete || false,
              isRComplete: sumData.isRComplete || false,
              isCMComplete: sumData.isCMComplete || false
            };
          }
        } catch (err) {
          summary[subj][grade] = { passedPercent: 0 };
        }
      });
    }
    
    // Calculate global average summary for "รวมทุกวิชา"
    summary["รวมทุกวิชา"] = {};
    const gradeTotals = {};
    Object.keys(summary).forEach(subj => {
      if (subj === "รวมทุกวิชา") return;
      Object.keys(summary[subj]).forEach(g => {
        if (!gradeTotals[g]) gradeTotals[g] = { sum: 0, count: 0 };
        gradeTotals[g].sum += summary[subj][g].passedPercent || 0;
        gradeTotals[g].count++;
      });
    });
    Object.keys(gradeTotals).forEach(g => {
       summary["รวมทุกวิชา"][g] = { passedPercent: Math.round(gradeTotals[g].sum / gradeTotals[g].count) };
    });

    return createJsonResponse({ metrics, curriculum, summary });
  }

  // 2. GET SCORES FOR A SUBJECT/GRADE
  if (action === 'get_scores') {
    const term = e.parameter.term;
    const subject = e.parameter.subject;
    const grade = e.parameter.grade;

    if (!term || !subject || !grade) {
      return createJsonResponse({ error: "Missing parameters for get_scores" });
    }

    const students = getStudentsByGrade(grade);
    const scoresSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_Scores");
    
    let scores = {};
    if (scoresSheet && scoresSheet.getLastRow() > 1) {
      const values = scoresSheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === term && values[i][1] === subject && values[i][2] === grade) {
          try {
            scores = JSON.parse(values[i][3]);
          } catch(e) {}
          break;
        }
      }
    }

    return createJsonResponse({ students, scores });
  }
  
  // 3. GET GLOBAL MATRIX (Average across all subjects)
  if (action === 'get_global_data') {
    const term = e.parameter.term;
    const grade = e.parameter.grade;
    if (!grade) return createJsonResponse({ error: "Missing grade parameter" });
    
    const students = getStudentsByGrade(grade);
    const scoresSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_Scores");
    
    // Format: { S1001: { ID, Name, Grade, Room, Subjects: { "ภาษาไทย": { CLevel, RLevel, CMLevel } } } }
    const resultDict = {};
    students.forEach(s => {
      resultDict[s.id] = { ID: s.id, Name: s.name, Grade: s.grade, Room: s.room, Subjects: {} };
    });

    if (scoresSheet && scoresSheet.getLastRow() > 1) {
      const values = scoresSheet.getDataRange().getValues();
      values.slice(1).forEach(row => {
        const rowTerm = row[0];
        const subj = row[1];
        const g = row[2];
        
        if (term && rowTerm !== term) return;
        if (g !== grade) return;
        
        try {
          const scoresJson = JSON.parse(row[3]);
          Object.keys(scoresJson).forEach(studentId => {
            if (!resultDict[studentId]) return;
            
            const studentScores = scoresJson[studentId];
            
            // Calculate levels based on standard logic
            let cSum = 0, rSum = 0, cmSum = 0;
            Object.keys(studentScores).forEach(key => {
              const val = parseInt(studentScores[key]) || 0;
              if (key.startsWith('C') && !key.startsWith('CM')) cSum += val;
              else if (key.startsWith('R') || key.startsWith('ST')) rSum += val;
              else if (key.startsWith('CM')) cmSum += val;
            });

            const getLevel = (sum, type) => {
              if (sum === 0) return "";
              if (type === 'C') { if (sum < 16) return "0"; if (sum < 31) return "1"; if (sum < 46) return "2"; return "3"; }
              if (type === 'R') { if (sum < 14) return "0"; if (sum <= 22) return "1"; if (sum <= 32) return "2"; return "3"; }
              if (type === 'CM') { if (sum < 10) return "0"; if (sum < 19) return "1"; if (sum < 28) return "2"; return "3"; }
              return "";
            };

            resultDict[studentId].Subjects[subj] = {
              CLevel: getLevel(cSum, 'C'),
              RLevel: getLevel(rSum, 'R'),
              CMLevel: getLevel(cmSum, 'CM')
            };
          });
        } catch(e) {}
      });
    }

    return createJsonResponse(Object.values(resultDict));
  }

  return createJsonResponse({ error: "Invalid Action" });
}

// ============================================================================
//  API ENDPOINTS (POST)
// ============================================================================

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return createJsonResponse({ status: "error", error: "Invalid JSON format" });
  }

  const action = data.action;

  // 1. SAVE SCORES
  if (action === 'save_scores') {
    const { term, subject, grade, scores, passedPercent, summaryData } = data;
    if (!term || !subject || !grade || !scores) {
       return createJsonResponse({ status: "error", error: "Missing parameters" });
    }

    const scoresSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_Scores");
    if (!scoresSheet) return createJsonResponse({ status: "error", error: "DB_Scores sheet not found" });

    const values = scoresSheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === term && values[i][1] === subject && values[i][2] === grade) {
        rowIndex = i + 1;
        break;
      }
    }

    const scoresStr = JSON.stringify(scores);
    const finalSummaryData = summaryData || { passedPercent };
    const summaryStr = JSON.stringify(finalSummaryData);

    if (rowIndex > -1) {
      scoresSheet.getRange(rowIndex, 4, 1, 2).setValues([[scoresStr, summaryStr]]);
    } else {
      scoresSheet.appendRow([term, subject, grade, scoresStr, summaryStr]);
    }

    return createJsonResponse({ status: "success" });
  }

  // 2. SAVE CURRICULUM
  if (action === 'save_curriculum') {
    setConfigValue("curriculum", data.rows || []);
    return createJsonResponse({ status: "success" });
  }

  return createJsonResponse({ status: "error", error: "Invalid Action" });
}

function testConnection() {
  Logger.log("Testing connection... Please deploy this script as Web App.");
}
