import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AssessmentGrid from './AssessmentGrid';
import SubjectMatrixTable from './SubjectMatrixTable';
import LoadingOverlay from './LoadingOverlay';
import { LogOut, Save, RefreshCw, Layers, FileDown, BarChart2, AlertTriangle, Users, Printer, Undo2, Redo2, BookOpen, CheckCircle2 } from 'lucide-react';
import { GRADES, FALLBACK_SUBJECTS, getAllSubjectsFromCurriculum, getSubjectsByTerm } from '../constants/subjects';
import { API_URL } from '../constants/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { useUndoHistory } from '../hooks/useUndoHistory';

function Dashboard({ subject, term, onLogout, curriculum, metrics, summary }) {
  const [data, setData] = useState(null);
  const [allGradesData, setAllGradesData] = useState({});
  const [localSummary, setLocalSummary] = useState(summary || {});
  const dataFetchStarted = useRef(false);
  const [selectedGrade, setSelectedGrade] = useState("ม.1");
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fetchErrors, setFetchErrors] = useState({});

  const isGlobalSummary = subject === "รวมเฉลี่ยทั้งหมด";
  const summaryTabs = [...GRADES, "รวม"];
  
  // ดึงวิชาทั้งหมดในเทอม (ใช้สำหรับหน้า "รวม" และเป็นฐาน)
  const allSubjectsForTerm = term ? getSubjectsByTerm(curriculum, term) : getAllSubjectsFromCurriculum(curriculum);

  // ดึงวิชาเฉพาะชั้นที่เลือก (ใช้สำหรับหน้าตาราง matrix แต่ละชั้น)
  const subjectsForSelectedGrade = useMemo(() => {
    if (!curriculum || !term) return allSubjectsForTerm;
    const matchingRows = curriculum.filter(r => r.เทอม === term && r.ชั้น === selectedGrade);
    if (matchingRows.length === 0) return allSubjectsForTerm; // Fallback if curriculum not fully setup
    const subjectNames = matchingRows.map(r => r.ชื่อวิชา);
    return allSubjectsForTerm.filter(sub => subjectNames.includes(sub));
  }, [curriculum, term, selectedGrade, allSubjectsForTerm]);

  // คำนวณระดับชั้นที่มีให้เลือกสำหรับวิชานี้ (กรองจากโครงสร้างเวลาเรียน)
  const availableGrades = useMemo(() => {
    if (isGlobalSummary) return summaryTabs;
    
    const subjectRows = (curriculum || []).filter(r => r.เทอม === term && r.ชื่อวิชา === subject);
    if (subjectRows.length > 0) {
      const allowed = subjectRows.map(r => r.ชั้น);
      // เรียงลำดับตาม GRADES เสมอ
      return GRADES.filter(g => allowed.includes(g));
    }
    
    return GRADES; // Fallback
  }, [subject, term, curriculum, isGlobalSummary]);

  // อัปเดต selectedGrade อัตโนมัติหากชั้นที่เลือกอยู่ไม่มีในโครงสร้าง
  useEffect(() => {
    if (availableGrades.length > 0 && !availableGrades.includes(selectedGrade)) {
      setSelectedGrade(availableGrades[0]);
    }
  }, [availableGrades, selectedGrade]);

  // Undo/Redo system
  const undoHistory = useUndoHistory(setData, !isGlobalSummary);

  const handleRefresh = useCallback(async () => {
    if (!API_URL) return;
    
    if (isGlobalSummary && selectedGrade === "รวม") {
      setData([]);
      return;
    }
    
    setRefreshing(true);
    setError(null);
    try {
      let url = "";
      if (isGlobalSummary) {
        url = `${API_URL}?action=get_global_data&term=${encodeURIComponent(term)}&grade=${encodeURIComponent(selectedGrade)}`;
      } else {
        url = `${API_URL}?action=get_scores&term=${encodeURIComponent(term)}&subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(selectedGrade)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      let result;
      try {
         result = JSON.parse(text);
      } catch {
         throw new Error("เซิร์ฟเวอร์ส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง (Non-JSON)");
      }

      if (result.error) {
         setError(result.error);
         setData([]);
      } else {
         let filteredData = [];
         if (isGlobalSummary) {
           filteredData = result;
           setAllGradesData(prev => ({ ...prev, [selectedGrade]: result }));
         } else {
           const list = result.students || [];
           const scoresMap = result.scores || {};
           filteredData = list.map(student => ({
             ...student,
             ID: student.id,
             Name: student.name,
             ...(scoresMap[student.id] || {})
           }));
         }
         setData(filteredData);
         
         // ล้าง undo history เมื่อเปลี่ยนข้อมูลใหม่
         if (undoHistory) undoHistory.clearHistory();
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
      setData([]);
    } finally {
      setRefreshing(false);
    }
  }, [term, subject, selectedGrade, isGlobalSummary]);

  // Auto-fetch all grades for global summary
  useEffect(() => {
    if (isGlobalSummary && Object.keys(allGradesData).length === 0 && !dataFetchStarted.current) {
      dataFetchStarted.current = true;
      const fetchAllGrades = async () => {
        setRefreshing(true);
        setFetchErrors({});
        const newData = {};
        const errors = {};
        
        const fetchWithRetry = async (grade, retries = 3, delay = 1000) => {
          for (let attempt = 1; attempt <= retries; attempt++) {
            try {
              const url = `${API_URL}?action=get_global_data&term=${encodeURIComponent(term)}&grade=${encodeURIComponent(grade)}`;
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);
              const response = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              
              const result = await response.json();
              if (result.error) throw new Error(result.error);
              return result;
            } catch (e) {
              console.error(`Attempt ${attempt} failed for ${grade}:`, e);
              if (attempt === retries) throw e;
              await new Promise(r => setTimeout(r, delay * attempt));
            }
          }
        };
        
        const promises = GRADES.map(async (grade) => {
          try {
            const result = await fetchWithRetry(grade);
            newData[grade] = result;
          } catch (e) {
            console.error(`Failed to fetch ${grade} after 3 retries:`, e);
            errors[grade] = e.message;
            newData[grade] = [];
          }
        });
        
        await Promise.all(promises);
        setAllGradesData(newData);
        setFetchErrors(errors);
        setRefreshing(false);
      };
      fetchAllGrades();
    }
  }, [isGlobalSummary]);

  useEffect(() => {
    handleRefresh();
  }, [subject, selectedGrade, handleRefresh]);

  const handleSave = async () => {
    if (isGlobalSummary || !data) return false;
    setIsSaving(true);
    try {
      const allKeys = Object.values(metrics).flatMap(cat => 
        cat.aspects.flatMap(aspect => 
          aspect.items.map((_, i) => {
            if (aspect.id === 'R' || aspect.id === 'ST') return `${aspect.id}${i + 1}`;
            return `${aspect.id}.${i + 1}`;
          })
        )
      );

      let totalExpectedCells = 0;
      let totalFilledCells = 0;
      const scoresMap = {};
      
      const cKeys = allKeys.filter(k => k.startsWith('C') && !k.startsWith('CM'));
      const rKeys = allKeys.filter(k => k.startsWith('R') || k.startsWith('ST'));
      const cmKeys = allKeys.filter(k => k.startsWith('CM'));

      let cCompleteCount = 0;
      let rCompleteCount = 0;
      let cmCompleteCount = 0;

      data.forEach(student => {
        const studentScores = {};
        Object.keys(student).forEach(k => {
          if (k.startsWith('C') || k.startsWith('R') || k.startsWith('ST')) {
            studentScores[k] = student[k];
            if (/^[1-3]$/.test(student[k])) totalFilledCells++;
          }
        });
        scoresMap[student.ID] = studentScores;
        totalExpectedCells += allKeys.length;

        const hasAllC = cKeys.length > 0 && cKeys.every(k => student[k] && /^[1-3]$/.test(student[k]));
        const hasAllR = rKeys.length > 0 && rKeys.every(k => student[k] && /^[1-3]$/.test(student[k]));
        const hasAllCM = cmKeys.length > 0 && cmKeys.every(k => student[k] && /^[1-3]$/.test(student[k]));
        
        if (hasAllC) cCompleteCount++;
        if (hasAllR) rCompleteCount++;
        if (hasAllCM) cmCompleteCount++;
      });
      const passedPercent = totalExpectedCells > 0 ? Math.round((totalFilledCells / totalExpectedCells) * 100) : 0;
      const isCComplete = cCompleteCount === data.length && data.length > 0;
      const isRComplete = rCompleteCount === data.length && data.length > 0;
      const isCMComplete = cmCompleteCount === data.length && data.length > 0;
      
      const summaryData = { passedPercent, isCComplete, isRComplete, isCMComplete };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'save_scores',
          term: term,
          subject: subject,
          grade: selectedGrade,
          scores: scoresMap,
          passedPercent: passedPercent,
          summaryData: summaryData
        })
      });
      
      const text = await response.text();
      let res;
      try {
         res = JSON.parse(text);
      } catch {
         throw new Error("เซิร์ฟเวอร์บันทึกข้อมูลแต่ส่งคำตอบกลับมาผิดรูปแบบ");
      }

      if (res.status === "success") {
        setLocalSummary(prev => ({
          ...prev,
          [subject]: {
            ...(prev[subject] || {}),
            [selectedGrade]: summaryData
          }
        }));
        if (undoHistory) undoHistory.clearHistory(); // Clear history after save
        await Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          text: 'ข้อมูลถูกส่งไปบันทึกที่ Google Sheet เรียบร้อยแล้ว',
          confirmButtonColor: '#2563eb'
        });
        return true;
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการบันทึก',
          text: res.error || "ไม่สามารถระบุสาเหตุได้",
          confirmButtonColor: '#ef4444'
        });
        return false;
      }
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'การเชื่อมต่อล้มเหลว',
        text: 'กรุณาตรวจสอบอินเทอร์เน็ต: ' + err.message,
        confirmButtonColor: '#ef4444'
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintPDF = () => {
    if (isGlobalSummary && selectedGrade === "รวม") {
      Swal.fire({ icon: 'info', title: 'เลือกชั้นเรียนก่อน', text: 'กรุณาเลือกชั้น ม.1-ม.6 ก่อนพิมพ์รายงาน', confirmButtonColor: '#2563eb' });
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = document.getElementById('printable-content');
    
    if (!printContent) {
      Swal.fire({ icon: 'error', title: 'ไม่พบเนื้อหาที่จะพิมพ์', text: 'กรุณารอให้ข้อมูลโหลดเสร็จก่อน', confirmButtonColor: '#ef4444' });
      return;
    }

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>รายงานผลการประเมิน - ${subject} ${selectedGrade}</title>
        <style>
          @page { size: A4 landscape; margin: 0.8cm 0.5cm; }
          body { font-family: 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 14pt; line-height: 1.2; margin: 0; padding: 0; color: #000; }
          .print-header { text-align: center; margin-bottom: 0.5cm; border-bottom: 2px solid #333; padding-bottom: 0.3cm; }
          .print-title { font-size: 16pt; font-weight: bold; margin-bottom: 0.1cm; }
          .print-subtitle { font-size: 14pt; }
          table { width: 100%; border-collapse: collapse; font-size: 12pt; table-layout: fixed; }
          th, td { border: 1px solid #333; padding: 2px 3px; text-align: center; vertical-align: middle; }
          th { background: #d0d0d0; font-weight: bold; font-size: 12pt; }
          td { height: 18px; }
          .student-name { text-align: left; padding-left: 4px; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-title">รายงานผลการประเมิน</div>
          <div class="print-subtitle">${subject} - ${selectedGrade} - ${term || ''}</div>
        </div>
        ${printContent.innerHTML}
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const reloadGrade = async (grade) => {
    setRefreshing(true);
    try {
      const url = `${API_URL}?action=get_global_data&term=${encodeURIComponent(term)}&grade=${encodeURIComponent(grade)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const result = await response.json();
      if (!result.error) {
        setAllGradesData(prev => ({ ...prev, [grade]: result }));
        setFetchErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[grade];
          return newErrors;
        });
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      console.error(`Failed to reload ${grade}:`, e);
      setFetchErrors(prev => ({ ...prev, [grade]: e.message }));
    } finally {
      setRefreshing(false);
    }
  };

  // คำนวณร้อยละ
  const calculateGradePassRate = (gradeName) => {
    const students = allGradesData[gradeName] || [];
    if (students.length === 0) return 0;
    let studentsWithLevel2or3 = 0;
    students.forEach(s => {
      if (!s.Subjects) return;
      const hasPassingLevel = Object.values(s.Subjects).some(subData => 
        (subData.CLevel === "3" || subData.CLevel === "2") ||
        (subData.RLevel === "3" || subData.RLevel === "2") ||
        (subData.CMLevel === "3" || subData.CMLevel === "2")
      );
      if (hasPassingLevel) studentsWithLevel2or3++;
    });
    return (studentsWithLevel2or3 / students.length) * 100;
  };

  const calculateSubjectRoomStatus = () => {
    const matrixSubjects = allSubjectsForTerm;
    const status = {};
    matrixSubjects.forEach(subject => {
      status[subject] = {};
      GRADES.forEach(grade => {
        const students = allGradesData[grade] || [];
        if (students.length === 0) {
          status[subject][grade] = { hasData: false, filled: 0, total: 0, percent: 0 };
          return;
        }
        
        // เช็คก่อนว่าวิชานี้มีการสอนในชั้นนี้ไหม (อิงจาก curriculum)
        const isTaughtInGrade = (curriculum || []).some(r => r.เทอม === term && r.ชั้น === grade && r.ชื่อวิชา === subject);
        if (!isTaughtInGrade) {
          status[subject][grade] = { hasData: false, filled: 0, total: 0, percent: 0 };
          return;
        }

        let cCount = 0;
        let rCount = 0;
        let cmCount = 0;
        
        students.forEach(s => {
          const subData = s.Subjects?.[subject];
          if (subData) {
            if (subData.CLevel && subData.CLevel !== "") cCount++;
            if (subData.RLevel && subData.RLevel !== "") rCount++;
            if (subData.CMLevel && subData.CMLevel !== "") cmCount++;
          }
        });
        
        const totalPossible = students.length * 3;
        const totalFilled = cCount + rCount + cmCount;
        
        status[subject][grade] = {
          hasData: true,
          filled: totalFilled,
          total: totalPossible,
          cCount, rCount, cmCount,
          isCComplete: cCount === students.length && students.length > 0,
          isRComplete: rCount === students.length && students.length > 0,
          isCMComplete: cmCount === students.length && students.length > 0,
          percent: totalPossible > 0 ? Math.round((totalFilled / totalPossible) * 100) : 0
        };
      });
    });
    return status;
  };

  const checkUnsavedChanges = (callback) => {
    if (undoHistory && undoHistory.canUndo) {
      Swal.fire({
        title: 'มีข้อมูลที่ยังไม่ได้บันทึก!',
        text: "ต้องการบันทึกข้อมูลก่อนเปลี่ยนหน้าหรือไม่?",
        icon: 'warning',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        denyButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'บันทึกข้อมูล',
        denyButtonText: 'ทิ้งการแก้ไข',
        cancelButtonText: 'ยกเลิก'
      }).then(async (result) => {
        if (result.isConfirmed) {
          const success = await handleSave();
          if (success) {
            callback();
          }
        } else if (result.isDenied) {
          if (undoHistory) undoHistory.clearHistory();
          callback();
        }
      });
    } else {
      callback();
    }
  };

  const isGradeComplete = (grade) => {
    if (grade === selectedGrade && data && data.length > 0) {
      const allKeys = Object.values(metrics).flatMap(cat => 
        cat.aspects.flatMap(aspect => 
          aspect.items.map((_, i) => {
            if (aspect.id === 'R' || aspect.id === 'ST') return `${aspect.id}${i + 1}`;
            return `${aspect.id}.${i + 1}`;
          })
        )
      );
      return data.every(student => 
        allKeys.every(k => student[k] && /^[1-3]$/.test(student[k]))
      );
    }
    const gradeSummary = localSummary && localSummary[subject] && localSummary[subject][grade];
    if (gradeSummary && typeof gradeSummary === 'object') {
      return gradeSummary.passedPercent === 100;
    }
    return gradeSummary === 100;
  };

  const handleGradeChange = (grade) => {
    if (grade === selectedGrade) return;
    checkUnsavedChanges(() => setSelectedGrade(grade));
  };

  const exportAllToExcel = () => {
    const hasData = isGlobalSummary && selectedGrade === "รวม" 
      ? Object.keys(allGradesData).length > 0 && Object.values(allGradesData).some(arr => arr.length > 0)
      : data && data.length > 0;
      
    if (!hasData) {
       Swal.fire({ icon: 'warning', title: 'ไม่มีข้อมูล', text: 'ไม่สามารถส่งออกไฟล์ที่ไม่มีข้อมูลได้', confirmButtonColor: '#eab308' });
       return;
    }

    if (!isGlobalSummary) {
      const wsData = [];
      const header1 = ["ลำดับ", "รหัสประจำตัว", "ชื่อ-สกุล"];
      const cAspects = metrics.characteristics?.aspects || [];
      const rAspects = metrics.evaluations?.aspects || [];
      const cmAspects = metrics.competencies?.aspects || [];
      
      cAspects.forEach((a, i) => header1.push(i === 0 ? metrics.characteristics.title : ""));
      let evalItemCount = 0;
      rAspects.forEach(a => evalItemCount += a.items.length);
      for (let i = 0; i < evalItemCount; i++) header1.push(i === 0 ? metrics.evaluations.title : "");
      cmAspects.forEach((a, i) => header1.push(i === 0 ? metrics.competencies.title : ""));
      wsData.push(header1);

      const header2 = ["", "", ""];
      cAspects.forEach(a => header2.push(a.label));
      rAspects.forEach(a => a.items.forEach((item, idx) => header2.push(a.id === "R" ? `${idx + 1}. ${item}` : item)));
      cmAspects.forEach(a => header2.push(a.label));
      wsData.push(header2);

      data.forEach((student, index) => {
         const row = [index + 1, student.ID, student.Name];
         cAspects.forEach(a => row.push(student[a.id] || ""));
         rAspects.forEach(a => {
            a.items.forEach((_, idx) => {
               const key = a.id === "R" ? `R${idx + 1}` : `ST${idx + 1}`;
               row.push(student[key] || "");
            });
         });
         cmAspects.forEach(a => row.push(student[a.id] || ""));
         wsData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [
        { s: {r: 0, c: 0}, e: {r: 1, c: 0} },
        { s: {r: 0, c: 1}, e: {r: 1, c: 1} },
        { s: {r: 0, c: 2}, e: {r: 1, c: 2} },
        { s: {r: 0, c: 3}, e: {r: 0, c: 3 + cAspects.length - 1} },
        { s: {r: 0, c: 3 + cAspects.length}, e: {r: 0, c: 3 + cAspects.length + evalItemCount - 1} },
        { s: {r: 0, c: 3 + cAspects.length + evalItemCount}, e: {r: 0, c: 3 + cAspects.length + evalItemCount + cmAspects.length - 1} }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedGrade);
      XLSX.writeFile(wb, `รายงาน_${subject}_${selectedGrade}.xlsx`);
      return;
    }

    const wb = XLSX.utils.book_new();
    const matrixSubjects = allSubjectsForTerm;
    
    GRADES.forEach(grade => {
      const gradeData = allGradesData[grade] || [];
      if (gradeData.length === 0) return;
      
      const matchingRows = (curriculum || []).filter(r => r.เทอม === term && r.ชั้น === grade);
      const allowedSubs = matchingRows.map(r => r.ชื่อวิชา);
      const gradeMatrixSubjects = allowedSubs.length > 0 ? allSubjectsForTerm.filter(sub => allowedSubs.includes(sub)) : allSubjectsForTerm;

      const wsData = [];
      const addTable = (title, categoryKey) => {
         wsData.push([title]);
         wsData.push(['ที่', 'ชื่อ-สกุล', ...gradeMatrixSubjects]);
         gradeData.forEach(s => {
            const row = [s.ID, s.Name];
            gradeMatrixSubjects.forEach(sub => row.push(s.Subjects?.[sub]?.[categoryKey] || "-"));
            wsData.push(row);
         });
         wsData.push([]);
      };
      
      addTable("1. ผลการประเมินคุณลักษณะอันพึงประสงค์ 8 ด้าน ระดับ ดี ขึ้นไป", "CLevel");
      addTable("2. ผลการประเมินการอ่าน คิดวิเคราะห์ ฯ และคุณลักษณะอันพึงประสงค์ของรายวิชา ฯ ระดับ ดี ขึ้นไป", "RLevel");
      addTable("3. ผลการประเมินสมรรถนะ 5 ด้าน ระดับ ดี ขึ้นไป", "CMLevel");
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, grade);
    });
    
    // Summary sheet
    const summaryRows = [];
    summaryRows.push(['สรุปผลร้อยละระดับโรงเรียน (ภาพรวมทุกระดับชั้น)']);
    summaryRows.push([]);
    summaryRows.push(['ชั้น', 'จำนวนนักเรียน (ทั้งหมด)', 'ร้อยละ (ระดับ 3 + 2)']);
    
    let totalStudentsAll = 0, totalPassRateSum = 0, validGradeCount = 0;
    GRADES.forEach(grade => {
      const students = allGradesData[grade] || [];
      const count = students.length;
      const passRate = calculateGradePassRate(grade);
      summaryRows.push([grade, count > 0 ? `${count} คน` : '-', count > 0 ? passRate.toFixed(2) : '-']);
      totalStudentsAll += count;
      if (count > 0) { totalPassRateSum += passRate; validGradeCount++; }
    });
    
    const avgPassRate = validGradeCount > 0 ? (totalPassRateSum / validGradeCount).toFixed(2) : '0.00';
    summaryRows.push(['รวม/เฉลี่ย', `${totalStudentsAll} คน`, avgPassRate]);
    
    summaryRows.push([]);
    summaryRows.push(['สถานะการกรอกข้อมูล (วิชา × ห้อง)']);
    summaryRows.push(['วิชา / ชั้น', ...GRADES, 'รวม']);
    
    const subjectStatus = calculateSubjectRoomStatus();
    matrixSubjects.forEach(subj => {
       const row = [subj];
       let totalFilled = 0, totalStudents = 0;
       GRADES.forEach(grade => {
          const status = subjectStatus[subj]?.[grade];
          totalFilled += status?.filled || 0;
          totalStudents += status?.total || 0;
          row.push(!status?.hasData ? "-" : `${status.percent}% (${status.filled}/${status.total})`);
       });
       row.push(totalStudents > 0 ? `${Math.round((totalFilled / totalStudents) * 100)}%` : "0%");
       summaryRows.push(row);
    });
    
    if (summaryRows.length > 0) {
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, summaryWs, "รวม");
    }
    
    XLSX.writeFile(wb, `สรุปภาพรวมโรงเรียน_ทุกระดับชั้น.xlsx`);
  };

  const renderSchoolSummary = () => {
    const subjectStatus = calculateSubjectRoomStatus();
    const matrixSubjects = allSubjectsForTerm;
    
    return (
    <div className="bg-white/95 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-soft fade-in">
       <h2 className="text-2xl font-black mb-6 text-center text-text-main">
          สรุปผลร้อยละระดับโรงเรียน (ภาพรวมทุกระดับชั้น)
       </h2>
       
       {/* Grade Summary Table */}
       <div className="overflow-x-auto rounded-xl border border-border mb-8">
          <table className="w-full text-base">
             <thead>
                <tr className="bg-slate-50">
                   <th className="p-4 w-[120px] text-left text-text-muted font-semibold text-sm uppercase border-b border-border">ชั้น</th>
                   <th className="p-4 text-center text-text-muted font-semibold text-sm uppercase border-b border-border">จำนวนนักเรียน</th>
                   <th className="p-4 text-center text-text-muted font-semibold text-sm uppercase border-b border-border">ร้อยละ (ระดับ 3 + 2)</th>
                   <th className="p-4 text-center text-text-muted font-semibold text-sm uppercase border-b border-border">ความพร้อม</th>
                </tr>
             </thead>
             <tbody>
                {GRADES.map(grade => {
                   const students = allGradesData[grade] || [];
                   const count = students.length;
                   const passRate = calculateGradePassRate(grade);
                   const hasError = fetchErrors[grade];

                   return (
                      <tr key={grade} className="hover:bg-slate-50/80 transition-colors">
                         <td className="p-4 font-extrabold text-center border-b border-border">{grade}</td>
                         <td className="p-4 text-center border-b border-border">
                           {hasError ? (
                             <span className="text-danger text-sm">❌ โหลดไม่สำเร็จ</span>
                           ) : count > 0 ? `${count} คน` : "ยังไม่มีข้อมูล"}
                         </td>
                         <td className="p-4 text-center font-black border-b border-border" style={{ color: hasError ? '#dc2626' : '#2563eb' }}>
                            {hasError ? (
                              <button 
                                onClick={() => reloadGrade(grade)}
                                className="px-4 py-2 text-sm bg-red-50 text-danger border border-danger rounded-lg cursor-pointer font-semibold hover:bg-red-100 transition-colors"
                              >
                                โหลดใหม่
                              </button>
                            ) : count > 0 ? passRate.toFixed(2) : "-"}
                         </td>
                         <td className="p-4 border-b border-border">
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                               <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hasError ? 0 : passRate}%`, background: hasError ? '#ef4444' : '#2563eb' }}></div>
                            </div>
                         </td>
                      </tr>
                   );
                })}
                <tr className="bg-slate-50 font-extrabold border-t-2 border-slate-300">
                   <td className="p-4 text-center">รวม/เฉลี่ย</td>
                   <td className="p-4 text-center">
                     {(() => { let total = 0; GRADES.forEach(g => total += (allGradesData[g] || []).length); return `${total} คน`; })()}
                   </td>
                   <td className="p-4 text-center text-primary">
                     {(() => { let sum = 0, count = 0; GRADES.forEach(g => { const students = allGradesData[g] || []; if (students.length > 0) { sum += calculateGradePassRate(g); count++; } }); return count > 0 ? (sum / count).toFixed(2) : '0.00'; })()}
                   </td>
                   <td className="p-4"></td>
                </tr>
             </tbody>
          </table>
       </div>

       {/* Subject × Grade Status */}
       <h3 className="text-xl font-extrabold mb-4 text-center text-slate-700">
         สถานะการกรอกข้อมูล (วิชา × ห้อง)
       </h3>
       <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
             <thead>
                <tr className="bg-slate-100">
                   <th className="p-3 text-left min-w-[180px] text-text-muted font-semibold text-xs uppercase border-b border-border">วิชา / ชั้น</th>
                   {GRADES.map(grade => (
                     <th key={grade} className="p-3 text-center min-w-[70px] text-text-muted font-semibold text-xs uppercase border-b border-border">{grade}</th>
                   ))}
                   <th className="p-3 text-center text-text-muted font-semibold text-xs uppercase border-b border-border">รวม</th>
                </tr>
             </thead>
             <tbody>
                {matrixSubjects.map((subj, idx) => {
                   let totalFilled = 0;
                   let totalStudents = 0;
                   
                   return (
                      <tr key={subj} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-primary-light/30 transition-colors`}>
                         <td className="p-3 font-semibold border-b border-border">{subj}</td>
                         {GRADES.map(grade => {
                           const status = subjectStatus[subj]?.[grade];
                           totalFilled += status?.filled || 0;
                           totalStudents += status?.total || 0;
                           
                           if (!status?.hasData) {
                             return <td key={grade} className="p-2 text-center text-slate-300 border-b border-border">-</td>;
                           }
                           
                           const isComplete = status.percent === 100;
                           const isPartial = status.percent > 0 && status.percent < 100;
                           
                           return (
                             <td key={grade} className="p-2 text-center border-b border-border">
                               <div className="flex flex-col items-center gap-1">
                                 <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                   isComplete ? 'bg-green-100 text-green-600' : isPartial ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                                 }`}>
                                   {status.percent}%
                                 </div>
                                 {(status.isCComplete || status.isRComplete || status.isCMComplete) && (
                                   <div className="flex gap-1 mt-1">
                                     {status.isCComplete && <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold" title={`คุณลักษณะ: ${status.cCount}/${status.total/3}`}>ค</span>}
                                     {status.isRComplete && <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold" title={`การอ่าน คิดวิเคราะห์: ${status.rCount}/${status.total/3}`}>อ</span>}
                                     {status.isCMComplete && <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold" title={`สมรรถนะ: ${status.cmCount}/${status.total/3}`}>ส</span>}
                                   </div>
                                 )}
                               </div>
                             </td>
                           );
                         })}
                         <td className="p-3 text-center font-extrabold border-b border-border">
                           {totalStudents > 0 ? Math.round((totalFilled / totalStudents) * 100) : 0}%
                         </td>
                      </tr>
                   );
                })}
             </tbody>
          </table>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center py-3 text-sm border-t border-border mt-2 bg-slate-50 rounded-b-xl">
            <div className="flex items-center gap-2">
              <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold">ค</span>
              <span className="text-xs text-text-muted">คุณลักษณะฯ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold">อ</span>
              <span className="text-xs text-text-muted">การอ่านคิดฯ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold">ส</span>
              <span className="text-xs text-text-muted">สมรรถนะฯ</span>
            </div>
          </div>
       </div>
    </div>
  );};

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 pb-6">
      {/* Loading Overlay */}
      {(refreshing || isSaving) && (
        <LoadingOverlay message={isSaving ? "กำลังบันทึกข้อมูล..." : "กำลังโหลดข้อมูล..."} />
      )}

      {/* Header */}
      <header className={`flex flex-wrap justify-between items-center mb-4 px-5 py-4 rounded-2xl shadow-soft border transition-all ${
        isGlobalSummary 
          ? 'bg-gradient-to-r from-primary-light to-white border-2 border-primary' 
          : 'bg-white/95 backdrop-blur-sm border-border'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-xl ${isGlobalSummary ? 'bg-blue-600' : 'bg-gradient-to-br from-primary to-primary-hover'}`}>
            {isGlobalSummary ? <BarChart2 size={32} color="white" /> : <Layers size={32} color="white" />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-text-main">
              {subject}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-text-muted font-semibold text-sm">
                {isGlobalSummary ? 'รายงานสรุปผลสัมฤทธิ์ภาพรวมรายวิชา' : 'บันทึกผลการประเมินวิชา'}
              </p>
              {term && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-light text-primary text-xs font-bold border border-primary/20">
                  <BookOpen size={12} />
                  {term}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
          {!isGlobalSummary && (
             <button 
               onClick={handleSave} 
               disabled={isSaving || !data?.length}
               className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-br from-primary to-primary-hover text-white border-0 cursor-pointer transition-all hover:shadow-glow-primary hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
               บันทึก
             </button>
          )}
          {isGlobalSummary && selectedGrade !== "รวม" && (
             <button 
               onClick={handlePrintPDF}
               className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-br from-amber-400 to-amber-600 text-white border-0 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
             >
               <Printer size={18} />
               พิมพ์ PDF
             </button>
          )}
          <button 
            onClick={exportAllToExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-br from-success to-emerald-600 text-white border-0 cursor-pointer transition-all hover:shadow-glow-success hover:-translate-y-0.5"
          >
            <FileDown size={18} />
            Excel
          </button>
          <button 
            onClick={() => checkUnsavedChanges(onLogout)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white text-danger border border-danger cursor-pointer transition-all hover:bg-red-50 hover:-translate-y-0.5"
          >
            <LogOut size={18} />
            ออก
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
         <div className="flex items-center gap-4 bg-red-50 border border-red-200 text-rose-700 rounded-xl p-4 mb-4">
            <AlertTriangle size={24} />
            <div>
               <p className="font-bold">พบข้อผิดพลาดจากเซิร์ฟเวอร์</p>
               <p className="text-sm">{error}</p>
               <p className="text-xs mt-1 text-red-500">คำแนะนำ: ตรวจสอบว่าแอป Google Script มีการ Deploy เป็นเวอร์ชันล่าสุดและตั้งค่าเป็น "Anyone"</p>
            </div>
         </div>
      )}

      {/* Grade Tabs */}
      <div className="flex gap-1 mb-4 bg-white/95 backdrop-blur-sm p-1.5 rounded-xl shadow-sm border border-border">
        {availableGrades.map(grade => {
          const complete = grade !== "รวม" ? isGradeComplete(grade) : false;
          return (
          <button
            key={grade}
            onClick={() => handleGradeChange(grade)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 px-4 rounded-lg font-extrabold text-sm transition-all duration-200 border-0 cursor-pointer ${
              selectedGrade === grade
                ? grade === "รวม"
                  ? 'bg-gradient-to-br from-pink-500 to-pink-700 text-white shadow-lg'
                  : 'bg-gradient-to-br from-primary to-primary-hover text-white shadow-glow-primary'
                : 'bg-transparent text-text-muted hover:bg-slate-50'
            }`}
          >
            {grade}
            {complete && <CheckCircle2 size={16} className={selectedGrade === grade ? 'text-white' : 'text-green-500'} />}
          </button>
        )})}
      </div>

      {/* Content Area */}
      <div className="relative min-h-[200px]">
        <div className={`fade-in transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
           {isGlobalSummary ? (
              selectedGrade === "รวม" ? (
                 renderSchoolSummary()
              ) : (
                 <div id="printable-content">
                    <SubjectMatrixTable 
                       students={data || []} 
                       categoryKey="CLevel" 
                       title="1. ผลการประเมินคุณลักษณะอันพึงประสงค์ 8 ด้าน ระดับ ดี ขึ้นไป"
                       subjects={subjectsForSelectedGrade}
                    />
                    <SubjectMatrixTable 
                       students={data || []} 
                       categoryKey="RLevel" 
                       title="2. ผลการประเมินการอ่าน คิดวิเคราะห์ ฯ และคุณลักษณะอันพึงประสงค์ของรายวิชา ฯ ระดับ ดี ขึ้นไป"
                       subjects={subjectsForSelectedGrade}
                    />
                    <SubjectMatrixTable 
                       students={data || []} 
                       categoryKey="CMLevel" 
                       title="3. ผลการประเมินสมรรถนะ 5 ด้าน ระดับ ดี ขึ้นไป"
                       subjects={subjectsForSelectedGrade}
                    />
                 </div>
              )
           ) : (
              <AssessmentGrid data={data || []} setData={setData} isGlobalSummary={isGlobalSummary} undoHistory={undoHistory} metrics={metrics} />
           )}
           
           {(!data || data.length === 0) && !error && !refreshing && (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                 <Users size={48} className="text-slate-400 mb-4 mx-auto" />
                 <p className="text-slate-500 font-semibold">ยังไม่มีรายชื่อนักเรียนในระดับชั้น {selectedGrade}</p>
                 <p className="text-sm text-slate-400 mt-1">กรุณากลับไปเพิ่มรายชื่อใน Google Spreadsheet ครับ</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
