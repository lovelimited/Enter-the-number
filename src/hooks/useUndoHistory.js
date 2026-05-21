import { useState, useCallback, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

const MAX_HISTORY = 50;

/**
 * Custom hook สำหรับระบบ Undo/Redo (Ctrl+Z / Ctrl+Y)
 * @param {Function} setData - setState function สำหรับ update data
 * @param {boolean} enabled - เปิด/ปิด undo system
 */
export function useUndoHistory(setData, enabled = true) {
  const undoStack = useRef([]); // stack ของ previous states
  const redoStack = useRef([]); // stack ของ redo states
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const isUndoRedoAction = useRef(false); // flag เพื่อกัน loop

  // บันทึก snapshot ก่อนเปลี่ยนข้อมูล
  const pushHistory = useCallback((currentData) => {
    if (!enabled || isUndoRedoAction.current) return;

    // Deep clone
    const snapshot = JSON.parse(JSON.stringify(currentData));
    undoStack.current.push(snapshot);

    // จำกัดขนาด stack
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }

    // ล้าง redo stack เมื่อมีการเปลี่ยนแปลงใหม่
    redoStack.current = [];

    setUndoCount(undoStack.current.length);
    setRedoCount(0);
  }, [enabled]);

  // ย้อนกลับ
  const undo = useCallback(() => {
    if (!enabled || undoStack.current.length === 0) return false;

    isUndoRedoAction.current = true;

    // เก็บ state ปัจจุบันลง redo stack ก่อน
    // (ต้องดึง current data จาก callback)

    const previousState = undoStack.current.pop();
    setUndoCount(undoStack.current.length);

    // ใช้ functional setState เพื่อดึง current value ไป redo
    setData((currentData) => {
      redoStack.current.push(JSON.parse(JSON.stringify(currentData)));
      setRedoCount(redoStack.current.length);
      return previousState;
    });

    // แสดง toast
    const Toast = Swal.mixin({
      toast: true,
      position: 'bottom-start',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      background: '#1e293b',
      color: '#e2e8f0',
      customClass: {
        popup: 'text-sm'
      }
    });

    Toast.fire({
      icon: 'info',
      title: `↩️ ย้อนกลับแล้ว (เหลือ ${undoStack.current.length} ครั้ง)`
    });

    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 0);

    return true;
  }, [enabled, setData]);

  // ทำซ้ำ
  const redo = useCallback(() => {
    if (!enabled || redoStack.current.length === 0) return false;

    isUndoRedoAction.current = true;

    const nextState = redoStack.current.pop();
    setRedoCount(redoStack.current.length);

    setData((currentData) => {
      undoStack.current.push(JSON.parse(JSON.stringify(currentData)));
      setUndoCount(undoStack.current.length);
      return nextState;
    });

    const Toast = Swal.mixin({
      toast: true,
      position: 'bottom-start',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      background: '#1e293b',
      color: '#e2e8f0',
      customClass: {
        popup: 'text-sm'
      }
    });

    Toast.fire({
      icon: 'info',
      title: `↪️ ทำซ้ำแล้ว (เหลือ ${redoStack.current.length} ครั้ง)`
    });

    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 0);

    return true;
  }, [enabled, setData]);

  // ล้าง history ทั้งหมด
  const clearHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    setUndoCount(0);
    setRedoCount(0);
  }, []);

  // ฟัง Ctrl+Z / Ctrl+Y globally
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ctrl+Z (Windows) / Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y (Windows) / Cmd+Shift+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, undo, redo]);

  return {
    pushHistory,
    undo,
    redo,
    clearHistory,
    undoCount,
    redoCount,
    canUndo: undoCount > 0,
    canRedo: redoCount > 0
  };
}
