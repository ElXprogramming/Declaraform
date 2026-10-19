import { PDFDocument } from 'pdf-lib';
import { PDF_TEMPLATES } from '../../utils/constants';
import {
  UPLOAD_LIMITS,
  decodeSignatureDataUrl,
  groupFormSchema,
  individualFormSchema,
  logSafeError,
  sanitizePdfText,
  validatePdfUpload,
} from '../../utils/security';

const FONT_SETTINGS = { size: 11 };
const CHECK_MARK = 'X';
const CHECK_MARK_SIZE = 12;
const MAX_PREVIEW_PAGES = 12;

const INDIVIDUAL_ASSESSMENT_COORDS = {
  Assignment: { x: 220, y: 523 },
  Quiz: { x: 220, y: 500 },
  'Lab Exercise': { x: 450, y: 523 },
  Project: { x: 450, y: 500 },
  Others: { x: 220, y: 480, textX: 250, textY: 458 },
};

const GROUP_ASSESSMENT_COORDS = {
  Assignment: { x: 222, y: 532 },
  Quiz: { x: 222, y: 510 },
  'Lab Exercise': { x: 393, y: 529 },
  Project: { x: 393, y: 506 },
  Others: { x: 222, y: 489, textX: 245, textY: 460 },
};

const createPdfBlobUrl = (pdfBytes) =>
  URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));

const drawAssessmentType = (page, assessmentType, otherAssessment, coordsMap) => {
  const coords = coordsMap[assessmentType];
  if (!coords) return;

  page.drawText(CHECK_MARK, { x: coords.x, y: coords.y, size: CHECK_MARK_SIZE });
  if (assessmentType === 'Others' && otherAssessment) {
    page.drawText(sanitizePdfText(otherAssessment, 60), {
      x: coords.textX,
      y: coords.textY,
      ...FONT_SETTINGS,
    });
  }
};

const embedSignature = async (pdfDoc, page, signatureDataUrl, { x, y, maxWidth, maxHeight }) => {
  if (!signatureDataUrl) return;

  // Decode base64 signature directly and verify PNG/JPEG magic bytes (never call fetch on data URLs)
  const decoded = decodeSignatureDataUrl(signatureDataUrl);
  if (!decoded) return;

  let signatureImage;
  if (decoded.format === 'png') {
    signatureImage = await pdfDoc.embedPng(decoded.bytes);
  } else if (decoded.format === 'jpeg') {
    signatureImage = await pdfDoc.embedJpg(decoded.bytes);
  }

  if (!signatureImage) return;

  const originalDims = signatureImage.scale(1);
  if (originalDims.width <= 0 || originalDims.height <= 0) return;

  const scale = Math.min(maxWidth / originalDims.width, maxHeight / originalDims.height);
  const scaledDims = signatureImage.scale(scale);

  page.drawImage(signatureImage, {
    x,
    y,
    width: scaledDims.width,
    height: scaledDims.height,
  });
};

const extractSinglePageUrls = async (sourceDoc, maxPages = sourceDoc.getPageCount()) => {
  const count = Math.min(sourceDoc.getPageCount(), maxPages);
  const pageUrls = [];

  for (let i = 0; i < count; i++) {
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(sourceDoc, [i]);
    singleDoc.addPage(copiedPage);
    const singleBytes = await singleDoc.save();
    pageUrls.push(createPdfBlobUrl(singleBytes));
  }

  return pageUrls;
};

export const generateIndividualForm = async (rawFormData) => {
  try {
    const parsed = individualFormSchema.safeParse(rawFormData);
    if (!parsed.success) {
      logSafeError('generateIndividualForm.validation', parsed.error);
      return null;
    }
    const formData = parsed.data;

    const templateResponse = await fetch(PDF_TEMPLATES.INDIVIDUAL, { credentials: 'same-origin' });
    if (!templateResponse.ok) {
      throw new Error('Failed to load individual PDF template.');
    }
    const existingPdfBytes = await templateResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const [firstPage] = pdfDoc.getPages();

    // A. Student's Information
    firstPage.drawText(formData.fullName, { x: 220, y: 645, ...FONT_SETTINGS });
    firstPage.drawText(formData.matricNo, { x: 220, y: 615, ...FONT_SETTINGS });
    firstPage.drawText(formData.phoneEmail, { x: 220, y: 592, ...FONT_SETTINGS });
    firstPage.drawText(formData.courseName, { x: 220, y: 572, ...FONT_SETTINGS });
    firstPage.drawText(formData.courseCode, { x: 220, y: 550, ...FONT_SETTINGS });

    drawAssessmentType(
      firstPage,
      formData.assessmentType,
      formData.otherAssessment,
      INDIVIDUAL_ASSESSMENT_COORDS
    );

    // B. Declaration (AI Tools Checkbox)
    if (formData.usedAITools) {
      firstPage.drawText(CHECK_MARK, { x: 38, y: 225, size: CHECK_MARK_SIZE });
    }

    // C. Student Declaration & Signature
    firstPage.drawText(formData.icPassport, { x: 90, y: 182, ...FONT_SETTINGS });
    firstPage.drawText(formData.date, { x: 294, y: 112, ...FONT_SETTINGS });

    await embedSignature(pdfDoc, firstPage, formData.signature, {
      x: 30,
      y: 120,
      maxWidth: 150,
      maxHeight: 35,
    });

    const pdfBytes = await pdfDoc.save();
    return {
      url: createPdfBlobUrl(pdfBytes),
      bytes: pdfBytes,
    };
  } catch (error) {
    logSafeError('generateIndividualForm', error);
    return null;
  }
};

export const generateGroupForm = async (rawFormData) => {
  try {
    const parsed = groupFormSchema.safeParse(rawFormData);
    if (!parsed.success) {
      logSafeError('generateGroupForm.validation', parsed.error);
      return null;
    }
    const formData = parsed.data;

    const templateResponse = await fetch(PDF_TEMPLATES.GROUP, { credentials: 'same-origin' });
    if (!templateResponse.ok) {
      throw new Error('Failed to load group PDF template.');
    }
    const existingPdfBytes = await templateResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const [firstPage, secondPage] = pdfDoc.getPages();

    // A. Leader's Information (Page 1)
    firstPage.drawText(formData.leaderName, { x: 220, y: 650, ...FONT_SETTINGS });
    firstPage.drawText(formData.leaderMatric, { x: 220, y: 625, ...FONT_SETTINGS });
    firstPage.drawText(formData.leaderPhoneEmail, { x: 220, y: 600, ...FONT_SETTINGS });
    firstPage.drawText(formData.courseName, { x: 220, y: 580, ...FONT_SETTINGS });
    firstPage.drawText(formData.courseCode, { x: 220, y: 559, ...FONT_SETTINGS });

    drawAssessmentType(
      firstPage,
      formData.assessmentType,
      formData.otherAssessment,
      GROUP_ASSESSMENT_COORDS
    );

    // B. Declaration (AI Tools Checkbox)
    if (formData.usedAITools) {
      firstPage.drawText(CHECK_MARK, { x: 34, y: 230, size: CHECK_MARK_SIZE });
    }

    // C. Leader Declaration & Signature
    firstPage.drawText(formData.icPassport, { x: 125, y: 186, ...FONT_SETTINGS });
    firstPage.drawText(formData.date, { x: 300, y: 116, ...FONT_SETTINGS });

    await embedSignature(pdfDoc, firstPage, formData.signature, {
      x: 30,
      y: 120,
      maxWidth: 150,
      maxHeight: 40,
    });

    // D. List of Group Members (Page 2 Table)
    const startY = 626;
    const rowHeight = 22;

    for (let index = 0; index < formData.members.length; index++) {
      const member = formData.members[index];
      if (!member.name && !member.matric) continue;

      const currentY = startY - index * rowHeight;

      secondPage.drawText(member.name, { x: 50, y: currentY, size: 10 });
      secondPage.drawText(member.matric, { x: 265, y: currentY, size: 10 });
      secondPage.drawText(member.ic, { x: 368, y: currentY, size: 10 });

      await embedSignature(pdfDoc, secondPage, member.signature, {
        x: 490,
        y: currentY - 5,
        maxWidth: 60,
        maxHeight: 18,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const fullUrl = createPdfBlobUrl(pdfBytes);

    // Single-page blobs for mobile preview (iOS Safari cannot scroll past page 1 in an iframe)
    const pages = await extractSinglePageUrls(pdfDoc, 2);

    return {
      url: fullUrl,
      bytes: pdfBytes,
      pages,
    };
  } catch (error) {
    logSafeError('generateGroupForm', error);
    return null;
  }
};

export const mergeMultiplePdfs = async (fileList) => {
  try {
    if (!Array.isArray(fileList) || fileList.length < 2) {
      throw new Error('At least 2 PDF files are required to merge.');
    }
    if (fileList.length > UPLOAD_LIMITS.MAX_PDF_FILES) {
      throw new Error(`Cannot merge more than ${UPLOAD_LIMITS.MAX_PDF_FILES} PDF files at once.`);
    }

    let totalBytes = 0;
    const mergedPdf = await PDFDocument.create();

    for (const item of fileList) {
      const rawFile = item?.file instanceof File ? item.file : item;
      const validation = await validatePdfUpload(rawFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      totalBytes += rawFile.size;
      if (totalBytes > UPLOAD_LIMITS.MAX_TOTAL_PDF_BYTES) {
        throw new Error('Total size of selected PDF files exceeds the 100 MB safety limit.');
      }

      const arrayBuffer = await rawFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    const fullUrl = createPdfBlobUrl(pdfBytes);
    const totalPages = mergedPdf.getPageCount();
    const pageUrls = await extractSinglePageUrls(mergedPdf, MAX_PREVIEW_PAGES);

    return {
      url: fullUrl,
      bytes: pdfBytes,
      pageCount: totalPages,
      pages: pageUrls,
    };
  } catch (error) {
    logSafeError('mergeMultiplePdfs', error);
    throw new Error('Unable to merge the selected PDF files.');
  }
};