import { PDFDocument, rgb } from 'pdf-lib';

const drawDebugGrid = (page) => {
  const { width, height } = page.getSize();
  const step = 10; 

  for (let x = 0; x < width; x += step) {
    page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    page.drawText(`${x}`, { x, y: 10, size: 8, color: rgb(1, 0, 0) });
  }

  for (let y = 0; y < height; y += step) {
    page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    page.drawText(`${y}`, { x: 10, y, size: 8, color: rgb(0, 0, 1) }); 
  }
};

export const generateIndividualForm = async (formData) => {
  try {
    // Fetch the blank template
    
    const url = '/templates/declarationFormIndividual.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0]; 

    // drawDebugGrid(firstPage);

    // Standard font settings
    const fontSettings = { size: 11 };

    // A. Student's Information (Adjust X and Y coordinates as needed)
    firstPage.drawText(formData.fullName, { x: 220, y: 645, ...fontSettings });
    firstPage.drawText(formData.matricNo, { x: 220, y: 615, ...fontSettings });
    firstPage.drawText(formData.phoneEmail, { x: 220, y: 592, ...fontSettings });
    firstPage.drawText(formData.courseName, { x: 220, y: 572, ...fontSettings });
    firstPage.drawText(formData.courseCode, { x: 220, y: 550, ...fontSettings });

    // Assessment Type Checkboxes
    const checkMark = 'X';
    switch (formData.assessmentType) {
      case 'Assignment':
        firstPage.drawText(checkMark, { x: 220, y: 523, size: 12 });
        break;
      case 'Quiz':
        firstPage.drawText(checkMark, { x: 220, y: 500, size: 12 });
        break;
      case 'Lab Exercise':
        firstPage.drawText(checkMark, { x: 450, y: 523, size: 12 });
        break;
      case 'Project':
        firstPage.drawText(checkMark, { x: 450, y: 500, size: 12 });
        break;
      case 'Others':
        firstPage.drawText(checkMark, { x: 220, y: 480, size: 12 });
        firstPage.drawText(formData.otherAssessment, { x: 250, y: 458, ...fontSettings });
        break;
      default:
        break;
    }

    // B. Declaration (AI Tools Checkbox)
    if (formData.usedAITools) {
      firstPage.drawText(checkMark, { x: 38, y: 225, size: 12 });
    }

    // C. Student Declaration
    firstPage.drawText(formData.icPassport, { x: 90, y: 182, ...fontSettings });
    firstPage.drawText(formData.date, { x: 294, y: 112, ...fontSettings });

    // Serialize and Download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Individual_Declaration_${formData.matricNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("Error generating Individual PDF:", error);
  }
};

export const generateGroupForm = async (formData) => {
  try {
    const url = '/templates/declarationFormGroup.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0]; // Leader info
    const secondPage = pages[1]; // Table of members

    drawDebugGrid(firstPage);

    const fontSettings = { size: 11 };

    // A. Leader's Information (Page 1)
    firstPage.drawText(formData.leaderName, { x: 220, y: 650, ...fontSettings });
    firstPage.drawText(formData.leaderMatric, { x: 220, y: 625, ...fontSettings });
    firstPage.drawText(formData.leaderPhoneEmail, { x: 220, y: 600, ...fontSettings });
    firstPage.drawText(formData.courseName, { x: 220, y: 580, ...fontSettings });
    firstPage.drawText(formData.courseCode, { x: 220, y: 559, ...fontSettings });

    // D. List of Group Members (Page 2 Table)
    // Starting Y coordinate for the first row in the table
    drawDebugGrid(firstPage);

    const startY = 650; 
    const rowHeight = 25; // Space between each row

    formData.members.forEach((member, index) => {
      if (!member.name && !member.matric) return; // Skip empty rows
      
      const currentY = startY - (index * rowHeight);
      
      secondPage.drawText(member.name, { x: 90, y: currentY, size: 10 });
      secondPage.drawText(member.matric, { x: 300, y: currentY, size: 10 });
      secondPage.drawText(member.ic, { x: 420, y: currentY, size: 10 });
    });

    // Serialize and Download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Group_Declaration_${formData.leaderMatric}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("Error generating Group PDF:", error);
  }
};