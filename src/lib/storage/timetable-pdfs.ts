/**
 * Supabase Storage - Timetable PDFs
 * 
 * Utilities for caching generated timetable PDFs
 * - Stores PDFs to avoid regeneration
 * - Faster downloads for students/faculty
 * - Versioning support for updated timetables
 */

import { supabaseBrowser } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TIMETABLE_PDFS_BUCKET = 'timetable-exports';
const CACHE_DURATION = 3600; // 1 hour

export interface TimetablePDFMetadata {
  timetableId: string;
  title: string;
  batchName: string;
  semester: number;
  departmentName: string;
  generatedAt: string;
  version: number;
}

export interface CachedTimetablePDF {
  url: string;
  filePath: string;
  metadata: TimetablePDFMetadata;
  cacheHit: boolean;
}

/**
 * Generate file path for timetable PDF
 */
function generatePDFPath(
  collegeId: string,
  departmentId: string,
  timetableId: string,
  version: number = 1
): string {
  const timestamp = new Date().toISOString().split('.')[0].replace(/:/g, '-');
  return `${collegeId}/${departmentId}/${timetableId}/v${version}_${timestamp}.pdf`;
}

/**
 * Check if cached PDF exists for a timetable
 */
export async function getCachedTimetablePDF(
  timetableId: string
): Promise<string | null> {
  try {
    // List all PDFs for this timetable
    const path = timetableId;
    const { data: files, error } = await supabaseBrowser.storage
      .from(TIMETABLE_PDFS_BUCKET)
      .list(path, {
        sortBy: { column: 'created_at', order: 'desc' },
        limit: 1,
      });

    if (error || !files || files.length === 0) {
      return null;
    }

    // Get the most recent PDF
    const latestFile = files[0];
    const fullPath = `${path}/${latestFile.name}`;

    const { data: urlData } = supabaseBrowser.storage
      .from(TIMETABLE_PDFS_BUCKET)
      .getPublicUrl(fullPath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error checking cached PDF:', error);
    return null;
  }
}

/**
 * Upload generated timetable PDF to cache
 */
export async function uploadTimetablePDF(
  blob: Blob,
  collegeId: string,
  departmentId: string,
  timetableId: string,
  metadata: Omit<TimetablePDFMetadata, 'generatedAt' | 'version'>
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Determine version number
    const existingPDFs = await listTimetablePDFs(collegeId, departmentId, timetableId);
    const version = existingPDFs.length + 1;

    const filePath = generatePDFPath(collegeId, departmentId, timetableId, version);

    // Upload PDF
    const { error: uploadError } = await supabaseBrowser.storage
      .from(TIMETABLE_PDFS_BUCKET)
      .upload(filePath, blob, {
        cacheControl: String(CACHE_DURATION),
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseBrowser.storage
      .from(TIMETABLE_PDFS_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading timetable PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * List all PDF versions for a timetable
 */
export async function listTimetablePDFs(
  collegeId: string,
  departmentId: string,
  timetableId: string
): Promise<Array<{ name: string; createdAt: string; url: string }>> {
  try {
    const path = `${collegeId}/${departmentId}/${timetableId}`;
    
    const { data: files, error } = await supabaseBrowser.storage
      .from(TIMETABLE_PDFS_BUCKET)
      .list(path, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error || !files) return [];

    return files.map(file => ({
      name: file.name,
      createdAt: file.created_at || '',
      url: supabaseBrowser.storage
        .from(TIMETABLE_PDFS_BUCKET)
        .getPublicUrl(`${path}/${file.name}`).data.publicUrl,
    }));
  } catch (error) {
    console.error('Error listing timetable PDFs:', error);
    return [];
  }
}

/**
 * Delete PDF cache for a timetable (when timetable is updated)
 */
export async function invalidateTimetablePDFCache(
  collegeId: string,
  departmentId: string,
  timetableId: string
): Promise<boolean> {
  try {
    const pdfs = await listTimetablePDFs(collegeId, departmentId, timetableId);
    
    if (pdfs.length === 0) return true;

    const path = `${collegeId}/${departmentId}/${timetableId}`;
    const  filePaths = pdfs.map(pdf => `${path}/${pdf.name}`);

    const { error } = await supabaseBrowser.storage
      .from(TIMETABLE_PDFS_BUCKET)
      .remove(filePaths);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error invalidating PDF cache:', error);
    return false;
  }
}

/**
 * Generate timetable PDF as Blob (for upload)
 */
export function generateTimetablePDFBlob(timetableData: {
  title: string;
  batch: string;
  semester: number;
  classes: any[];
  timeSlots: any[];
  days: string[];
}): Blob {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(timetableData.title, pageWidth / 2, 15, { align: 'center' });

  // Metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const metaY = 25;
  doc.text(`Batch: ${timetableData.batch}`, 14, metaY);
  doc.text(`Semester: ${timetableData.semester}`, pageWidth / 2, metaY, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, metaY, { align: 'right' });

  // Timetable Table
  const tableData = timetableData.timeSlots.map(slot => {
    const row = [slot.period];
    
    timetableData.days.forEach(day => {
      const classInfo = timetableData.classes.find(
        c => c.day === day && c.time_slot_id === slot.id
      );
      
      if (classInfo) {
        row.push(
          `${classInfo.subject_code}\n${classInfo.faculty_name}\n${classInfo.classroom_name}`
        );
      } else {
        row.push('-');
      }
    });
    
    return row;
  });

  (doc as any).autoTable({
    startY: 35,
    head: [['Time', ...timetableData.days]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [77, 134, 156],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        fillColor: [243, 244, 246],
        halign: 'left',
        cellWidth: 25,
      },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

/**
 * Get or generate timetable PDF (with caching)
 */
export async function getTimetablePDF(
  timetableId: string,
  collegeId: string,
  departmentId: string,
  timetableData: any,
  forceRegenerate: boolean = false
): Promise<CachedTimetablePDF | null> {
  try {
    // Check cache first (unless force regenerate)
    if (!forceRegenerate) {
      const cachedUrl = await getCachedTimetablePDF(timetableId);
      
      if (cachedUrl) {
        return {
          url: cachedUrl,
          filePath: '',
          metadata: {
            timetableId,
            title: timetableData.title,
            batchName: timetableData.batch,
            semester: timetableData.semester,
            departmentName: timetableData.departmentName,
            generatedAt: new Date().toISOString(),
            version: 1,
          },
          cacheHit: true,
        };
      }
    }

    // Generate new PDF
    const pdfBlob = generateTimetablePDFBlob(timetableData);

    // Upload to storage
    const result = await uploadTimetablePDF(
      pdfBlob,
      collegeId,
      departmentId,
      timetableId,
      {
        timetableId,
        title: timetableData.title,
        batchName: timetableData.batch,
        semester: timetableData.semester,
        departmentName: timetableData.departmentName,
      }
    );

    if (!result.success || !result.url) {
      throw new Error(result.error || 'Failed to upload PDF');
    }

    return {
      url: result.url,
      filePath: '',
      metadata: {
        timetableId,
        title: timetableData.title,
        batchName: timetableData.batch,
        semester: timetableData.semester,
        departmentName: timetableData.departmentName,
        generatedAt: new Date().toISOString(),
        version: 1,
      },
      cacheHit: false,
    };
  } catch (error) {
    console.error('Error getting timetable PDF:', error);
    return null;
  }
}
