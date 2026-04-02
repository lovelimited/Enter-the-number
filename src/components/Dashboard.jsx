import React, { useState, useEffect, useCallback, useRef } from 'react';
import AssessmentGrid from './AssessmentGrid';
import SubjectMatrixTable from './SubjectMatrixTable';
import LoadingOverlay from './LoadingOverlay';
import { LogOut, Save, RefreshCw, Layers, FileDown, TrendingUp, BarChart2, AlertTriangle, Users, Printer, FileText } from 'lucide-react';
import { GRADES, SUBJECTS } from '../constants/subjects';
import { API_URL } from '../constants/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

function Dashboard({ subject, onLogout }) {
  const [data, setData] = useState(null);
  const [allGradesData, setAllGradesData] = useState({});
  const dataFetchStarted = useRef(false);
  const [selectedGrade, setSelectedGrade] = useState("ม.1");
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fetchErrors, setFetchErrors] = useState({}); // track which grades failed

  const isGlobalSummary = subject === "รวมเฉลี่ยทั้งหมด";
  const summaryTabs = [...GRADES, "รวม"];

  const handleRefresh = useCallback(async () => {
    if (!API_URL) return;
    
    // Skip fetch when "รวม" tab is selected - backend doesn't support grade=รวม
    if (isGlobalSummary && selectedGrade === "รวม") {
      setData([]);
      return;
    }
    
    setRefreshing(true);
    setError(null);
    try {
      let url = "";
      if (isGlobalSummary) {
        url = `${API_URL}?action=get_global_data&grade=${encodeURIComponent(selectedGrade)}`;
      } else {
        url = `${API_URL}?action=get_data&subject=${encodeURIComponent(subject)}`;
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
         const list = isGlobalSummary ? result : (result.students || []);
         const filteredData = isGlobalSummary ? list : list.filter(s => s.Grade === selectedGrade);
         setData(filteredData);
         
         if (isGlobalSummary) {
            setAllGradesData(prev => ({ ...prev, [selectedGrade]: filteredData }));
         }
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
      setData([]);
    } finally {
      setRefreshing(false);
    }
  }, [subject, selectedGrade, isGlobalSummary]);

  // Auto-fetch all grades when entering global summary for the first time - with caching
  useEffect(() => {
    if (isGlobalSummary && Object.keys(allGradesData).length === 0 && !dataFetchStarted.current) {
      dataFetchStarted.current = true;
      // Fetch all grades in parallel on first load with retry
      const fetchAllGrades = async () => {
        setRefreshing(true);
        setFetchErrors({}); // clear errors
        const newData = {};
        const errors = {};
        
        const fetchWithRetry = async (grade, retries = 3, delay = 1000) => {
          for (let attempt = 1; attempt <= retries; attempt++) {
            try {
              const url = `${API_URL}?action=get_global_data&grade=${encodeURIComponent(grade)}`;
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
              const response = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              
              const result = await response.json();
              if (result.error) {
                throw new Error(result.error);
              }
              return result;
            } catch (e) {
              console.error(`Attempt ${attempt} failed for ${grade}:`, e);
              if (attempt === retries) {
                throw e;
              }
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
            newData[grade] = []; // empty data for failed grades
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
    if (isGlobalSummary || !data) return;
    setIsSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'save_data',
          subject: subject,
          rows: data 
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
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          text: 'ข้อมูลถูกส่งไปบันทึกที่ Google Sheet เรียบร้อยแล้ว (กรุณาเปิดดูที่ไฟล์ตารางของคุณ)',
          confirmButtonColor: '#3b82f6'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการบันทึก',
          text: res.error || "ไม่สามารถระบุสาเหตุได้",
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'การเชื่อมต่อล้มเหลว',
        text: 'กรุณาตรวจสอบอินเทอร์เน็ต หรือสถานะของ Google Script: ' + err.message,
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintPDF = () => {
    if (isGlobalSummary && selectedGrade === "รวม") {
      Swal.fire({
        icon: 'info',
        title: 'เลือกชั้นเรียนก่อน',
        text: 'กรุณาเลือกชั้น ม.1-ม.6 ก่อนพิมพ์รายงาน',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = document.getElementById('printable-content');
    
    if (!printContent) {
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบเนื้อหาที่จะพิมพ์',
        text: 'กรุณารอให้ข้อมูลโหลดเสร็จก่อน',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>รายงานผลการประเมิน - ${subject} ${selectedGrade}</title>
        <style>
          @page { 
            size: A4 landscape; 
            margin: 0.8cm 0.5cm; 
          }
          body { 
            font-family: 'TH Sarabun New', 'Sarabun', sans-serif; 
            font-size: 14pt;
            line-height: 1.2;
            margin: 0;
            padding: 0;
          }
          .print-header { 
            text-align: center; 
            margin-bottom: 0.5cm;
            border-bottom: 1px solid #000;
            padding-bottom: 0.3cm;
          }
          .print-title { 
            font-size: 16pt; 
            font-weight: bold; 
            margin-bottom: 0.1cm; 
          }
          .print-subtitle { 
            font-size: 14pt; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 12pt;
            table-layout: fixed;
          }
          th, td { 
            border: 0.5px solid #000; 
            padding: 2px 3px; 
            text-align: center;
            vertical-align: middle;
          }
          th { 
            background: #e8e8e8; 
            font-weight: bold;
            font-size: 12pt;
          }
          td { 
            height: 18px;
          }
          .student-name { 
            text-align: left;
            padding-left: 4px;
          }
          .section-title {
            font-weight: bold;
            text-align: left;
            padding: 4px;
            background: #f5f5f5;
            font-size: 13pt;
            page-break-inside: avoid;
          }
          .print-section {
            page-break-inside: avoid;
            margin-bottom: 0.5cm;
          }
          .page-break { 
            page-break-before: always; 
          }
          .section {
            margin-bottom: 0.3cm;
            page-break-inside: avoid;
          }
          .compact-table th,
          .compact-table td {
            padding: 1px 2px;
            font-size: 11pt;
          }
          .level-cell {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-title">รายงานผลการประเมิน</div>
          <div class="print-subtitle">${subject} - ${selectedGrade}</div>
        </div>
        ${printContent.innerHTML}
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const reloadGrade = async (grade) => {
    setRefreshing(true);
    try {
      const url = `${API_URL}?action=get_global_data&grade=${encodeURIComponent(grade)}`;
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

  const exportAllToExcel = () => {
    if (!data || data.length === 0) {
       Swal.fire({
          icon: 'warning',
          title: 'ไม่มีข้อมูล',
          text: 'ไม่สามารถส่งออกไฟล์ที่ไม่มีข้อมูลได้',
          confirmButtonColor: '#eab308'
       });
       return;
    }

    if (!isGlobalSummary) {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedGrade);
      XLSX.writeFile(wb, `รายงาน_${subject}_${selectedGrade}.xlsx`);
      return;
    }

    const wb = XLSX.utils.book_new();
    GRADES.forEach(grade => {
      const gradeData = allGradesData[grade] || [];
      if (gradeData.length === 0) return;
      const rows = gradeData.map(s => {
        const row = { 'ที่': s.ID, 'ชื่อ-สกุล': s.Name };
        SUBJECTS.forEach(sub => {
          if (sub === "รวมเฉลี่ยทั้งหมด") return;
          row[sub] = s.Subjects?.[sub]?.CLevel || "-";
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, grade);
    });
    XLSX.writeFile(wb, `สรุปภาพรวมโรงเรียน_ทุกระดับชั้น.xlsx`);
  };

  // คำนวณร้อยละของนักเรียนที่มีระดับ 3 หรือ 2 ใน CLevel, RLevel, CMLevel รวมกัน
  const calculateGradePassRate = (gradeName) => {
    const students = allGradesData[gradeName] || [];
    if (students.length === 0) return 0;

    // นับเฉพาะนักเรียนที่มีข้อมูลระดับ 3 หรือ 2 ในอย่างน้อย 1 ด้าน (CLevel, RLevel, หรือ CMLevel)
    // โดยดูจากข้อมูลที่แสดงในตารางจริงๆ
    let studentsWithLevel2or3 = 0;
    
    students.forEach(s => {
      if (!s.Subjects) return;
      
      // ตรวจสอบทุกวิชา ถ้ามีระดับ 3 หรือ 2 ใน CLevel, RLevel, หรือ CMLevel
      const hasPassingLevel = Object.values(s.Subjects).some(subData => 
        (subData.CLevel === "3" || subData.CLevel === "2") ||
        (subData.RLevel === "3" || subData.RLevel === "2") ||
        (subData.CMLevel === "3" || subData.CMLevel === "2")
      );
      
      if (hasPassingLevel) {
        studentsWithLevel2or3++;
      }
    });

    return (studentsWithLevel2or3 / students.length) * 100;
  };

  // คำนวณสถานะการกรอกข้อมูล: วิชาไหนห้องไหนมีข้อมูลแล้วบ้าง
  const calculateSubjectRoomStatus = () => {
    const matrixSubjects = SUBJECTS.filter(s => s !== "รวมเฉลี่ยทั้งหมด");
    const status = {};
    
    matrixSubjects.forEach(subject => {
      status[subject] = {};
      GRADES.forEach(grade => {
        const students = allGradesData[grade] || [];
        if (students.length === 0) {
          status[subject][grade] = { hasData: false, filled: 0, total: 0, percent: 0 };
          return;
        }
        
        let filledCount = 0;
        students.forEach(s => {
          const subData = s.Subjects?.[subject];
          // ต้องมีข้อมูลครบทั้ง 3 ด้าน (CLevel, RLevel, CMLevel) ถือว่ากรอกครบ
          // ถ้ามีแค่บางด้าน ถือว่ากรอกบางส่วน (จะถูกนับเป็น filled แต่ percent จะไม่ถึง 100%)
          if (subData && subData.CLevel && subData.CLevel !== "" && 
              subData.RLevel && subData.RLevel !== "" && 
              subData.CMLevel && subData.CMLevel !== "") {
            filledCount++;
          }
        });
        
        status[subject][grade] = {
          hasData: true,
          filled: filledCount,
          total: students.length,
          percent: Math.round((filledCount / students.length) * 100)
        };
      });
    });
    
    return status;
  };

  const renderSchoolSummary = () => {
    const subjectStatus = calculateSubjectRoomStatus();
    const matrixSubjects = SUBJECTS.filter(s => s !== "รวมเฉลี่ยทั้งหมด");
    
    return (
    <div className="card fade-in" style={{ padding: '2rem' }}>
       <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem', textAlign: 'center' }}>
          สรุปผลร้อยละระดับโรงเรียน (ภาพรวมทุกระดับชั้น)
       </h2>
       <div className="table-container" style={{ marginBottom: '3rem' }}>
          <table style={{ width: '100%', fontSize: '1.1rem' }}>
             <thead>
                <tr style={{ background: '#f8fafc' }}>
                   <th style={{ padding: '1.5rem', width: '120px' }}>ชั้น</th>
                   <th style={{ padding: '1.5rem' }}>จำนวนนักเรียน (ทั้งหมด)</th>
                   <th style={{ padding: '1.5rem' }}>ร้อยละ (ระดับ 3 + 2)</th>
                   <th style={{ padding: '1.5rem' }}>ความพร้อม</th>
                </tr>
             </thead>
             <tbody>
                {GRADES.map(grade => {
                   const students = allGradesData[grade] || [];
                   const count = students.length;
                   const passRate = calculateGradePassRate(grade);
                   const hasError = fetchErrors[grade];

                   return (
                      <tr key={grade}>
                         <td style={{ padding: '1.25rem', fontWeight: '800', textAlign: 'center' }}>{grade}</td>
                         <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                           {hasError ? (
                             <span style={{ color: '#dc2626', fontSize: '0.9rem' }}>❌ โหลดไม่สำเร็จ</span>
                           ) : count > 0 ? `${count} คน` : "ยังไม่มีข้อมูล"}
                         </td>
                         <td style={{ padding: '1.25rem', textAlign: 'center', fontWeight: '900', color: hasError ? '#dc2626' : 'var(--primary)' }}>
                            {hasError ? (
                              <button 
                                onClick={() => reloadGrade(grade)}
                                style={{ 
                                  padding: '0.5rem 1rem', 
                                  fontSize: '0.85rem',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #dc2626',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                โหลดใหม่
                              </button>
                            ) : count > 0 ? `${passRate.toFixed(2)}%` : "-"}
                         </td>
                         <td style={{ padding: '1.25rem' }}>
                            <div style={{ width: '100%', background: '#f1f5f9', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                               <div style={{ width: `${hasError ? 0 : passRate}%`, background: hasError ? '#ef4444' : 'var(--primary)', height: '100%' }}></div>
                            </div>
                         </td>
                      </tr>
                   );
                })}
             </tbody>
          </table>
       </div>

       {/* ตารางสรุปสถานะการกรอกข้อมูล */}
       <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center', color: '#334155' }}>
         สถานะการกรอกข้อมูล (วิชา × ห้อง)
       </h3>
       <div className="table-container">
          <table style={{ width: '100%', fontSize: '0.9rem' }}>
             <thead>
                <tr style={{ background: '#f1f5f9' }}>
                   <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '180px' }}>วิชา / ชั้น</th>
                   {GRADES.map(grade => (
                     <th key={grade} style={{ padding: '0.75rem', textAlign: 'center', minWidth: '70px' }}>{grade}</th>
                   ))}
                   <th style={{ padding: '0.75rem', textAlign: 'center' }}>รวม</th>
                </tr>
             </thead>
             <tbody>
                {matrixSubjects.map((subject, idx) => {
                   let totalFilled = 0;
                   let totalStudents = 0;
                   
                   return (
                      <tr key={subject} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                         <td style={{ padding: '0.75rem', fontWeight: '600' }}>{subject}</td>
                         {GRADES.map(grade => {
                           const status = subjectStatus[subject]?.[grade];
                           totalFilled += status?.filled || 0;
                           totalStudents += status?.total || 0;
                           
                           if (!status?.hasData) {
                             return <td key={grade} style={{ padding: '0.5rem', textAlign: 'center', color: '#cbd5e1' }}>-</td>;
                           }
                           
                           const isComplete = status.percent === 100;
                           const isPartial = status.percent > 0 && status.percent < 100;
                           
                           return (
                             <td key={grade} style={{ padding: '0.5rem', textAlign: 'center' }}>
                               <div style={{ 
                                 display: 'inline-flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 width: '32px',
                                 height: '32px',
                                 borderRadius: '50%',
                                 background: isComplete ? '#dcfce7' : isPartial ? '#fef9c3' : '#fee2e2',
                                 color: isComplete ? '#16a34a' : isPartial ? '#ca8a04' : '#dc2626',
                                 fontWeight: '700',
                                 fontSize: '0.75rem'
                               }}>
                                 {status.percent}%
                               </div>
                               <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                                 {status.filled}/{status.total}
                               </div>
                             </td>
                           );
                         })}
                         <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '800' }}>
                           {totalStudents > 0 ? Math.round((totalFilled / totalStudents) * 100) : 0}%
                         </td>
                      </tr>
                   );
                })}
             </tbody>
          </table>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#dcfce7', border: '1px solid #16a34a' }}></div>
              <span>กรอกครบ (100%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fef9c3', border: '1px solid #ca8a04' }}></div>
              <span>กรอกบางส่วน</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fee2e2', border: '1px solid #dc2626' }}></div>
              <span>ยังไม่กรอก / ไม่มีข้อมูล</span>
            </div>
          </div>
       </div>
    </div>
  );};

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      {/* Loading Overlay */}
      {(refreshing || isSaving) && (
        <LoadingOverlay message={isSaving ? "กำลังบันทึกข้อมูล..." : "กำลังโหลดข้อมูล..."} />
      )}

      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '1rem 1.25rem',
        background: isGlobalSummary ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' : '#fff',
        borderRadius: '1rem',
        boxShadow: 'var(--shadow)',
        border: isGlobalSummary ? '2px solid #3b82f6' : '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: isGlobalSummary ? '#2563eb' : 'var(--primary)', padding: '1rem', borderRadius: '1rem' }}>
            {isGlobalSummary ? <BarChart2 size={32} color="white" /> : <Layers size={32} color="white" />}
          </div>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: '900', color: 'var(--text)' }}>
              {subject}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
               {isGlobalSummary ? `รายงานสรุปผลสัมฤทธิ์ภาพรวมรายวิชา` : `บันทึกผลการประเมินวิชา`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isGlobalSummary && (
             <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || !data?.length}>
               {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
               บันทึก
             </button>
          )}
          {isGlobalSummary && selectedGrade !== "รวม" && (
             <button className="btn btn-secondary" onClick={handlePrintPDF} style={{ background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}>
               <Printer size={18} />
               พิมพ์ PDF
             </button>
          )}
          <button className="btn btn-primary" onClick={exportAllToExcel} style={{ background: '#10b981', borderColor: '#10b981' }}>
            <FileDown size={18} />
            Excel
          </button>
          <button className="btn" onClick={onLogout} style={{ color: 'var(--danger)' }}>
            <LogOut size={18} />
            ออก
          </button>
        </div>
      </header>

      {error && (
         <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#be123c' }}>
            <AlertTriangle size={24} />
            <div>
               <p style={{ fontWeight: '700' }}>พบข้อผิดพลาดจากเซิร์ฟเวอร์</p>
               <p style={{ fontSize: '0.9rem' }}>{error}</p>
               <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#e11d48' }}>
                  คำแนะนำ: ตรวจสอบว่าแอป Google Script มีการ Deploy เป็นเวอร์ชันล่าสุดและตั้งค่าเป็น "Anyone" หรือยัง
               </p>
            </div>
         </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#fff', padding: '0.375rem', borderRadius: '0.75rem', boxShadow: 'var(--shadow-sm)' }}>
        {(isGlobalSummary ? summaryTabs : GRADES).map(grade => (
          <button
            key={grade}
            className={`btn ${selectedGrade === grade ? 'btn-primary' : ''}`}
            onClick={() => setSelectedGrade(grade)}
            style={{ 
               flex: 1, 
               padding: '0.75rem 1.5rem', 
               fontWeight: '800',
               background: selectedGrade === grade ? (grade === "รวม" ? "#db2777" : "var(--primary)") : "transparent",
               borderColor: 'transparent',
               color: selectedGrade === grade ? "#fff" : "var(--text-muted)",
            }}
          >
            {grade}
          </button>
        ))}
      </div>

      <div id="table-loading-area" style={{ position: 'relative', minHeight: '200px' }}>
        {refreshing && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(255,255,255,0.9)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 100,
            borderRadius: '0.75rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>กำลังดึงข้อมูล...</p>
            </div>
          </div>
        )}
        
        <div className="fade-in" style={{ opacity: refreshing ? 0.5 : 1, transition: 'opacity 0.3s' }}>
           {isGlobalSummary ? (
              selectedGrade === "รวม" ? (
                 renderSchoolSummary()
              ) : (
                 <div id="printable-content">
                    <SubjectMatrixTable 
                       students={data || []} 
                       categoryKey="CLevel" 
                       title="1. ผลการประเมินคุณลักษณะอันพึงประสงค์ 8 ด้าน ระดับ ดี ขึ้นไป" 
                    />
                    <SubjectMatrixTable 
                       students={data || []} 
                       categoryKey="RLevel" 
                       title="2. ผลการประเมินการอ่าน คิดวิเคราะห์ ฯ และคุณลักษณะอันพึงประสงค์ของรายวิชา ฯ ระดับ ดี ขึ้นไป" 
                    />
                    <SubjectMatrixTable 
                       students={data || []} 
                       categoryKey="CMLevel" 
                       title="3. ผลการประเมินสมรรถนะ 5 ด้าน ระดับ ดี ขึ้นไป" 
                    />
                 </div>
              )
           ) : (
              <AssessmentGrid data={data || []} setData={setData} isGlobalSummary={isGlobalSummary} />
           )}
           
           {(!data || data.length === 0) && !error && !refreshing && (
              <div style={{ textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
                 <Users size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
                 <p style={{ color: '#64748b' }}>ยังไม่มีรายชื่อนักเรียนในระดับชั้น {selectedGrade}</p>
                 <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>กรุณากลับไปติดตั้งแผ่นงานหรือเพิ่มรายชื่อใน Google Spreadsheet ครับ</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
