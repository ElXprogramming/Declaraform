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

    if (formData.signature) {
      const signatureBytes = await fetch(formData.signature).then((res) => res.arrayBuffer());
      
      let signatureImage;
      if (formData.signature.includes('image/png')) {
        signatureImage = await pdfDoc.embedPng(signatureBytes);
      } else if (formData.signature.includes('image/jpeg')) {
        signatureImage = await pdfDoc.embedJpg(signatureBytes);
      }

      if (signatureImage) {
        // Change this line to use the new parameter! Make sure to parse it as a float.
        const scaleValue = parseFloat(formData.signatureScale);
        const scaledDims = signatureImage.scale(scaleValue);

        firstPage.drawImage(signatureImage, {
          x: 30,             
          y: 120,             
          width: scaledDims.width,
          height: scaledDims.height,
        });
      }
    }

    // Serialize and Return URL
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    // Instead of clicking an invisible link, we just return the URL
    return URL.createObjectURL(blob);



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

    //drawDebugGrid(firstPage);

    const fontSettings = { size: 11 };

    // A. Leader's Information (Page 1)
    firstPage.drawText(formData.leaderName, { x: 220, y: 650, ...fontSettings });
    firstPage.drawText(formData.leaderMatric, { x: 220, y: 625, ...fontSettings });
    firstPage.drawText(formData.leaderPhoneEmail, { x: 220, y: 600, ...fontSettings });
    firstPage.drawText(formData.courseName, { x: 220, y: 580, ...fontSettings });
    firstPage.drawText(formData.courseCode, { x: 220, y: 559, ...fontSettings });

    const checkMark = 'X';
    switch (formData.assessmentType) {
      case 'Assignment':
        firstPage.drawText(checkMark, { x: 222, y: 532, size: 12 });
        break;
      case 'Quiz':
        firstPage.drawText(checkMark, { x: 222, y: 510, size: 12 });
        break;
      case 'Lab Exercise':
        firstPage.drawText(checkMark, { x: 393, y: 529, size: 12 });
        break;
      case 'Project':
        firstPage.drawText(checkMark, { x: 393, y: 506, size: 12 });
        break;
      case 'Others':
        firstPage.drawText(checkMark, { x: 222, y: 489, size: 12 });
        firstPage.drawText(formData.otherAssessment, { x: 245, y: 460, ...fontSettings });
        break;
      default:
        break;
    }

    if (formData.usedAITools) {
      firstPage.drawText(checkMark, { x: 34, y: 230, size: 12 });
    }

    firstPage.drawText(formData.icPassport, { x: 125, y: 186, ...fontSettings });
    firstPage.drawText(formData.date, { x: 300, y: 116, ...fontSettings });

    if (formData.signature) {
      const signatureBytes = await fetch(formData.signature).then((res) => res.arrayBuffer());
      
      let signatureImage;
      if (formData.signature.includes('image/png')) {
        signatureImage = await pdfDoc.embedPng(signatureBytes);
      } else if (formData.signature.includes('image/jpeg')) {
        signatureImage = await pdfDoc.embedJpg(signatureBytes);
      }

      if (signatureImage) {
        // Change this line to use the new parameter! Make sure to parse it as a float.
        const scaleValue = parseFloat(formData.signatureScale);
        const scaledDims = signatureImage.scale(scaleValue);

        firstPage.drawImage(signatureImage, {
          x: 30,             
          y: 122,             
          width: scaledDims.width,
          height: scaledDims.height,
        });
      }
    }

    // D. List of Group Members (Page 2 Table)
    // Starting Y coordinate for the first row in the table
    //drawDebugGrid(secondPage);

    const startY = 626; 
    const rowHeight = 22; // Space between each row

    /**formData.members.forEach((member, index) => {
      if (!member.name && !member.matric) return; // Skip empty rows
      
      const currentY = startY - (index * rowHeight);
      
      secondPage.drawText(member.name, { x: 50, y: currentY, size: 10 });
      secondPage.drawText(member.matric, { x: 265, y: currentY, size: 10 });
      secondPage.drawText(member.ic, { x: 368, y: currentY, size: 10 });
      if (formData.signature) {
      const signatureBytes = await fetch(formData.signature).then((res) => res.arrayBuffer());
      
      let signatureImage;
      if (formData.signature.includes('image/png')) {
        signatureImage = await pdfDoc.embedPng(signatureBytes);
      } else if (formData.signature.includes('image/jpeg')) {
        signatureImage = await pdfDoc.embedJpg(signatureBytes);
      }

      if (signatureImage) {
        // Change this line to use the new parameter! Make sure to parse it as a float.
        const scaleValue = parseFloat(formData.signatureScale);
        const scaledDims = signatureImage.scale(scaleValue);

        firstPage.drawImage(signatureImage, {
          x: 200,             
          y: 220,             
          width: scaledDims.width,
          height: scaledDims.height,
        });
      }
    }
    });**/

    for (let index = 0; index < formData.members.length; index++) {
      const member = formData.members[index];
      
      if (!member.name && !member.matric) continue; // Skip empty rows
      
      const currentY = startY - (index * rowHeight);
      
      secondPage.drawText(member.name, { x: 50, y: currentY, size: 10 });
      secondPage.drawText(member.matric, { x: 265, y: currentY, size: 10 });
      secondPage.drawText(member.ic, { x: 368, y: currentY, size: 10 });

      // --- EMBED MEMBER SIGNATURE ---
      if (member.signature) {
        const signatureBytes = await fetch(member.signature).then(res => res.arrayBuffer());
        
        let signatureImage;
        if (member.signature.includes('image/png')) {
          signatureImage = await pdfDoc.embedPng(signatureBytes);
        } else if (member.signature.includes('image/jpeg')) {
          signatureImage = await pdfDoc.embedJpg(signatureBytes);
        }

        if (signatureImage) {
          const scaleValue = parseFloat(member.signatureScale);
          const scaledDims = signatureImage.scale(scaleValue);

          secondPage.drawImage(signatureImage, {
            x: 490, // Adjust this X coordinate using your grid! (Target the 5th column)
            y: currentY-7, // Offset Y slightly so it centers vertically on the line
            width: scaledDims.width,
            height: scaledDims.height,
          });
        }
      }
    }

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