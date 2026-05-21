import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Edit3, Trash2, ArrowLeft, Save, Filter, BookOpen, RefreshCw } from 'lucide-react';
import { GRADES, TERMS } from '../constants/subjects';
import Swal from 'sweetalert2';

function CurriculumManager({ curriculum, setCurriculum, onBack, apiUrl }) {
  const [filterTerm, setFilterTerm] = useState('ทั้งหมด');
  const [filterGrade, setFilterGrade] = useState('ทั้งหมด');
  const [isLoading, setIsLoading] = useState(false);

  // ─── Filtered Data ───────────────────────────────────────────────
  const filteredCurriculum = useMemo(() => {
    if (!curriculum) return [];
    return curriculum.filter(row => {
      const matchTerm = filterTerm === 'ทั้งหมด' || row.เทอม === filterTerm;
      const matchGrade = filterGrade === 'ทั้งหมด' || row.ชั้น === filterGrade;
      return matchTerm && matchGrade;
    });
  }, [curriculum, filterTerm, filterGrade]);

  // ─── Refresh Curriculum from API ─────────────────────────────────
  const refreshCurriculum = useCallback(async () => {
    if (!apiUrl) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}?action=get_init_data`);
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error('เซิร์ฟเวอร์ส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง');
      }
      if (result.error) {
        throw new Error(result.error);
      }
      const rawData = result.curriculum || [];
      setCurriculum(rawData.map((r, i) => ({ ...r, rowIndex: r.rowIndex || i })));
    } catch (err) {
      console.error('Refresh curriculum failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'โหลดข้อมูลไม่สำเร็จ',
        text: err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, setCurriculum]);

  // ─── Build SweetAlert2 HTML form ─────────────────────────────────
  const buildFormHtml = (defaults = {}) => {
    const gradeOptions = GRADES.map(
      g => `<option value="${g}" ${defaults.ชั้น === g ? 'selected' : ''}>${g}</option>`
    ).join('');
    const termOptions = TERMS.map(
      t => `<option value="${t}" ${defaults.เทอม === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    return `
      <div style="display:flex;flex-direction:column;gap:1rem;text-align:left;">
        <div>
          <label style="display:block;font-weight:700;margin-bottom:0.25rem;color:#334155;font-size:0.875rem;">รหัสวิชา</label>
          <input id="swal-code" class="swal2-input" placeholder="เช่น ท21101" value="${defaults.รหัสวิชา || ''}" style="margin:0;width:100%;" />
        </div>
        <div>
          <label style="display:block;font-weight:700;margin-bottom:0.25rem;color:#334155;font-size:0.875rem;">ชื่อวิชา</label>
          <input id="swal-name" class="swal2-input" placeholder="เช่น ภาษาไทย" value="${defaults.ชื่อวิชา || ''}" style="margin:0;width:100%;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div>
            <label style="display:block;font-weight:700;margin-bottom:0.25rem;color:#334155;font-size:0.875rem;">ชั้น</label>
            <select id="swal-grade" class="swal2-select" style="margin:0;width:100%;">${gradeOptions}</select>
          </div>
          <div>
            <label style="display:block;font-weight:700;margin-bottom:0.25rem;color:#334155;font-size:0.875rem;">เทอม</label>
            <select id="swal-term" class="swal2-select" style="margin:0;width:100%;">${termOptions}</select>
          </div>
        </div>
      </div>
    `;
  };

  // ─── Add Curriculum Row ──────────────────────────────────────────
  const handleAdd = async () => {
    const { value: formValues } = await Swal.fire({
      title: '<span style="font-weight:800;">เพิ่มวิชาใหม่</span>',
      html: buildFormHtml(),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'เพิ่มวิชา',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      focusConfirm: false,
      customClass: { popup: 'text-sm' },
      preConfirm: () => {
        const code = document.getElementById('swal-code').value.trim();
        const name = document.getElementById('swal-name').value.trim();
        const grade = document.getElementById('swal-grade').value;
        const term = document.getElementById('swal-term').value;
        if (!code || !name) {
          Swal.showValidationMessage('กรุณากรอกรหัสวิชาและชื่อวิชา');
          return false;
        }
        return { รหัสวิชา: code, ชื่อวิชา: name, ชั้น: grade, เทอม: term };
      },
    });

    if (!formValues) return;

    const newRow = {
      ...formValues,
      rowIndex: Date.now() + Math.random()
    };

    setCurriculum(prev => [...prev, newRow]);

    Swal.fire({
      icon: 'success',
      title: 'เพิ่มวิชาลงตารางแล้ว!',
      text: 'กรุณากด "บันทึกทั้งหมด" เพื่อส่งข้อมูลไปยังเซิร์ฟเวอร์',
      confirmButtonColor: '#2563eb',
      timer: 2500,
      timerProgressBar: true,
    });
  };

  // ─── Edit Curriculum Row ─────────────────────────────────────────
  const handleEdit = async (row) => {
    const { value: formValues } = await Swal.fire({
      title: '<span style="font-weight:800;">แก้ไขวิชา</span>',
      html: buildFormHtml(row),
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'บันทึกการแก้ไข',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      focusConfirm: false,
      customClass: { popup: 'text-sm' },
      preConfirm: () => {
        const code = document.getElementById('swal-code').value.trim();
        const name = document.getElementById('swal-name').value.trim();
        const grade = document.getElementById('swal-grade').value;
        const term = document.getElementById('swal-term').value;
        if (!code || !name) {
          Swal.showValidationMessage('กรุณากรอกรหัสวิชาและชื่อวิชา');
          return false;
        }
        return { รหัสวิชา: code, ชื่อวิชา: name, ชั้น: grade, เทอม: term };
      },
    });

    if (!formValues) return;

    // Optimistic update in local state
    setCurriculum(prev =>
      prev.map(r => {
        if (r.rowIndex !== undefined && row.rowIndex !== undefined) {
          return r.rowIndex === row.rowIndex ? { ...r, ...formValues } : r;
        }
        return r === row ? { ...r, ...formValues } : r;
      })
    );

    Swal.fire({
      icon: 'success',
      title: 'แก้ไขสำเร็จ!',
      text: 'กรุณากด "บันทึกทั้งหมด" เพื่อส่งข้อมูลไปยังเซิร์ฟเวอร์',
      confirmButtonColor: '#2563eb',
      timer: 2500,
      timerProgressBar: true,
    });
  };

  // ─── Delete Curriculum Row ───────────────────────────────────────
  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      html: `<p class="text-sm">ต้องการลบวิชา <strong>${row.รหัสวิชา} - ${row.ชื่อวิชา}</strong> (${row.ชั้น}, ${row.เทอม}) ใช่หรือไม่?</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
    });

    if (!result.isConfirmed) return;

    setCurriculum(prev => prev.filter(r => {
      // Use strict equality as fallback if rowIndex is missing
      if (r.rowIndex !== undefined && row.rowIndex !== undefined) {
        return r.rowIndex !== row.rowIndex;
      }
      return r !== row;
    }));

    Swal.fire({
      icon: 'success',
      title: 'ลบออกจากตารางแล้ว!',
      text: 'กรุณากด "บันทึกทั้งหมด" เพื่อส่งข้อมูลไปยังเซิร์ฟเวอร์',
      confirmButtonColor: '#2563eb',
      timer: 2500,
      timerProgressBar: true,
    });
  };

  // ─── Save All ────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!curriculum || curriculum.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลวิชาที่จะบันทึก',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'ยืนยันการบันทึก?',
      text: `จะบันทึกข้อมูลวิชาทั้งหมด ${curriculum.length} รายการไปยังเซิร์ฟเวอร์`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'บันทึกเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
    });

    if (!confirm.isConfirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'save_curriculum',
          rows: curriculum,
        }),
      });
      const text = await response.text();
      let res;
      try {
        res = JSON.parse(text);
      } catch {
        throw new Error('เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ไม่ถูกต้อง');
      }
      if (res.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          text: 'ข้อมูลวิชาทั้งหมดถูกบันทึกไปยัง Google Sheet เรียบร้อยแล้ว',
          confirmButtonColor: '#2563eb',
        });
        await refreshCurriculum();
      } else {
        throw new Error(res.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'การบันทึกล้มเหลว',
        text: err.message,
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!curriculum) return { total: 0, term1: 0, term2: 0, grades: 0 };
    return {
      total: curriculum.length,
      term1: curriculum.filter(r => r.เทอม === 'เทอม 1').length,
      term2: curriculum.filter(r => r.เทอม === 'เทอม 2').length,
      grades: new Set(curriculum.map(r => r.ชั้น)).size,
    };
  }, [curriculum]);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* ── Loading Overlay ── */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-8 py-6 shadow-2xl backdrop-blur-sm">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-bold text-text-main">กำลังดำเนินการ...</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        {/* ══════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════ */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-secondary shadow-lg shadow-primary/20">
          <div className="px-6 py-5 md:px-8 md:py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Left: title */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    โครงสร้างเวลาเรียน
                  </h1>
                  <p className="mt-0.5 text-sm font-medium text-white/80">
                    จัดการรายวิชาทั้งหมดในหลักสูตร
                  </p>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-md transition-all duration-200 hover:scale-105 hover:bg-primary-light hover:shadow-lg active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มวิชา
                </button>
                <button
                  onClick={handleSaveAll}
                  className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:brightness-110 hover:shadow-lg active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  บันทึกทั้งหมด
                </button>
                <button
                  onClick={refreshCurriculum}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/30 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  รีเฟรช
                </button>
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/30 active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                  กลับหน้าหลัก
                </button>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-px bg-white/10 md:grid-cols-4">
            {[
              { label: 'วิชาทั้งหมด', value: stats.total, color: 'text-white' },
              { label: 'เทอม 1', value: stats.term1, color: 'text-amber-200' },
              { label: 'เทอม 2', value: stats.term2, color: 'text-emerald-200' },
              { label: 'ระดับชั้น', value: stats.grades, color: 'text-purple-200' },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 px-5 py-3 text-center backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            FILTER BAR
        ══════════════════════════════════════════════════════════════ */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-white/95 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-text-muted">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-bold">ตัวกรอง:</span>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Filter: เทอม */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-muted">เทอม</label>
              <select
                value={filterTerm}
                onChange={e => setFilterTerm(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-main transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ทั้งหมด">ทั้งหมด</option>
                {TERMS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Filter: ชั้น */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-text-muted">ชั้น</label>
              <select
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-main transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ทั้งหมด">ทั้งหมด</option>
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Active filter count */}
            {(filterTerm !== 'ทั้งหมด' || filterGrade !== 'ทั้งหมด') && (
              <button
                onClick={() => { setFilterTerm('ทั้งหมด'); setFilterGrade('ทั้งหมด'); }}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger transition-colors hover:bg-danger/20"
              >
                ✕ ล้างตัวกรอง
              </button>
            )}
          </div>

          <div className="text-sm font-semibold text-text-muted sm:ml-auto">
            แสดง <span className="font-black text-primary">{filteredCurriculum.length}</span> จาก{' '}
            <span className="font-black text-text-main">{curriculum?.length || 0}</span> รายการ
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TABLE
        ══════════════════════════════════════════════════════════════ */}
        <div className="overflow-hidden rounded-xl border border-border bg-white/95 shadow-md backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <th className="whitespace-nowrap px-4 py-3.5 text-center text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    ลำดับ
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    รหัสวิชา
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    ชื่อวิชา
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-center text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    ชั้น
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-center text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    เทอม
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-center text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    จัดการ
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/50">
                {filteredCurriculum.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen className="h-12 w-12 text-border" />
                        <p className="text-base font-bold text-text-muted">ไม่พบข้อมูลวิชา</p>
                        <p className="text-sm text-text-muted/70">
                          {filterTerm !== 'ทั้งหมด' || filterGrade !== 'ทั้งหมด'
                            ? 'ลองปรับตัวกรองหรือล้างตัวกรองเพื่อดูข้อมูลทั้งหมด'
                            : 'กดปุ่ม "เพิ่มวิชา" เพื่อเริ่มเพิ่มรายวิชา'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCurriculum.map((row, idx) => (
                    <tr
                      key={row.rowIndex ?? idx}
                      className={`transition-colors duration-150 hover:bg-primary-light/50 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      {/* ลำดับ */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                      </td>

                      {/* รหัสวิชา */}
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-secondary/10 px-2 py-1 text-sm font-bold text-secondary">
                          {row.รหัสวิชา}
                        </span>
                      </td>

                      {/* ชื่อวิชา */}
                      <td className="px-4 py-3 font-semibold text-text-main">
                        {row.ชื่อวิชา}
                      </td>

                      {/* ชั้น */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                          {row.ชั้น}
                        </span>
                      </td>

                      {/* เทอม */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            row.เทอม === 'เทอม 1'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {row.เทอม}
                        </span>
                      </td>

                      {/* จัดการ */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-all duration-150 hover:bg-primary/10 hover:scale-110 active:scale-95"
                            title="แก้ไข"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-danger transition-all duration-150 hover:bg-danger/10 hover:scale-110 active:scale-95"
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {filteredCurriculum.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold text-text-muted">
                รายการทั้งหมด {filteredCurriculum.length} วิชา
              </p>
              <div className="flex items-center gap-4">
                {filterTerm === 'ทั้งหมด' && filterGrade === 'ทั้งหมด' && (
                  <p className="text-xs text-text-muted">
                    เทอม 1: <span className="font-bold text-amber-600">{stats.term1}</span>
                    {' · '}
                    เทอม 2: <span className="font-bold text-emerald-600">{stats.term2}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom actions (mobile-friendly) ── */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-bold text-text-muted shadow-sm transition-all duration-200 hover:bg-surface-hover hover:text-text-main"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับหน้าหลัก
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg sm:flex-initial"
            >
              <Plus className="h-4 w-4" />
              เพิ่มวิชา
            </button>
            <button
              onClick={handleSaveAll}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-success px-5 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:brightness-110 hover:shadow-lg sm:flex-initial"
            >
              <Save className="h-4 w-4" />
              บันทึกทั้งหมด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurriculumManager;
