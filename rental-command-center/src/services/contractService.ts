import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import { jsPDF } from 'jspdf';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { getBooking } from './bookingService';
import { getRental } from './rentalService';

export interface Contract {
  id: string;
  rentalId: string;            // reference to rental (or booking ID before conversion)
  customerId: string;
  customerName: string;        // denormalized
  contractType: "partA" | "partB" | "full";   // Part A (booking), Part B (delivery), or combined
  partAData?: {
    bookingId: string;
    startDate: Date;
    endDate: Date;
    items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    tax: number;
    total: number;
    depositRequired: number;
    advancePayment?: number;
    terms?: string;             // e.g., "Cancellation policy", "Damage policy"
    signedAt?: Date;
  };
  partBData?: {
    rentalId: string;
    actualDeliveryDate: Date;
    actualReturnDate?: Date;
    itemsLoaded: Array<{ name: string; quantity: number }>;
    conditionNotes?: string;    // e.g., "All items in good condition"
    clientAcceptance: boolean;
    signedAt?: Date;
  };
  pdfUrl: string;               // Firebase Storage URL
  pdfName: string;              // e.g., "Contract_ABC123.pdf"
  status: "Draft" | "Signed" | "Final";
  signatureImageUrl?: string;   // if signature is stored separately
  createdAt: Date;
  updatedAt: Date;
}

const contractsCollection = collection(db, 'contracts');

// Helper to convert base64 image data to PDF and upload to Firebase Storage
export const uploadContractPdf = async (file: Blob, rentalId: string, pdfName: string): Promise<string> => {
  try {
    const storageRef = ref(storage, `contracts/${rentalId || 'temp'}/${pdfName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error uploading contract PDF:", error);
    throw new Error("Failed to upload contract PDF.");
  }
};

// Programmatically draw PDF using jsPDF
const generateContractPdfBlob = async (contract: Omit<Contract, 'id'>): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Top Red Band
  doc.setFillColor(220, 38, 38); // Red-600
  doc.rect(0, 0, 210, 8, 'F');

  // Title Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(24, 24, 27); // Zinc-900
  doc.text("REDLINE RENTALS & LOGISTICS", 14, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 113, 122); // Zinc-500
  doc.text("PREMIUM EQUIPMENT AGREEMENTS & PROTOCOLS", 14, 27);

  // Red accent separator line
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.line(14, 30, 196, 30);

  // Document Type Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  let docTitle = "RENTAL SERVICE CONTRACT";
  let docSubtitle = "Equipment Rental Booking and Acceptance Protocol";
  if (contract.contractType === 'partA') {
    docTitle = "PART A: EQUIPMENT BOOKING AGREEMENT";
    docSubtitle = "Terms of booking, financial estimate and deposit security requirements";
  } else if (contract.contractType === 'partB') {
    docTitle = "PART B: DELIVERY & ACCEPTANCE HANDOVER";
    docSubtitle = "Equipment verification, loaded variant quantities, and site delivery handshake";
  } else if (contract.contractType === 'full') {
    docTitle = "COMBINED FULL SERVICE CONTRACT (PART A + B)";
    docSubtitle = "Fully validated service contract, logistics checklist and accepted handovers";
  }
  doc.text(docTitle, 14, 39);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(82, 82, 91); // Zinc-600
  doc.text(docSubtitle, 14, 44);

  // Metadata Section
  doc.setDrawColor(228, 228, 231); // Zinc-200
  doc.line(14, 48, 196, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);

  // Left col
  doc.setFont('helvetica', 'bold');
  doc.text("Customer:", 14, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.customerName, 40, 55);

  doc.setFont('helvetica', 'bold');
  doc.text("Contract Type:", 14, 61);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.contractType.toUpperCase(), 40, 61);

  doc.setFont('helvetica', 'bold');
  doc.text("Status:", 14, 67);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.status, 40, 67);

  // Right col
  doc.setFont('helvetica', 'bold');
  doc.text("Created At:", 110, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.createdAt.toLocaleString(), 135, 55);

  doc.setFont('helvetica', 'bold');
  doc.text("ID / Reference:", 110, 61);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.rentalId || "DRAFT_REF", 135, 61);

  doc.setDrawColor(228, 228, 231);
  doc.line(14, 72, 196, 72);

  let y = 75;

  // Render Part A Data
  if (contract.partAData) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text("PART A – AGREEMENT DETAILS", 14, y + 4);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(63, 63, 70);
    doc.text(`Booking Ref: ${contract.partAData.bookingId}`, 14, y);
    doc.text(`Rental Start Date: ${new Date(contract.partAData.startDate).toLocaleDateString()}`, 80, y);
    doc.text(`Rental End Date: ${new Date(contract.partAData.endDate).toLocaleDateString()}`, 140, y);
    y += 7;

    // Items table Part A
    doc.setFillColor(24, 24, 27); // Zinc-900
    doc.rect(14, y, 182, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Item / Equipment Variant", 16, y + 5);
    doc.text("Qty", 120, y + 5);
    doc.text("Daily Rate", 145, y + 5);
    doc.text("Total", 175, y + 5);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);

    contract.partAData.items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(244, 244, 245);
        doc.rect(14, y, 182, 6, 'F');
      }
      doc.text(item.name, 16, y + 4);
      doc.text(item.quantity.toString(), 120, y + 4);
      doc.text(`$${item.unitPrice.toFixed(2)}`, 145, y + 4);
      doc.text(`$${item.total.toFixed(2)}`, 175, y + 4);
      y += 6;
    });

    y += 3;

    // Totals Block
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(63, 63, 70);

    doc.text("Subtotal:", 135, y);
    doc.text(`$${contract.partAData.subtotal.toFixed(2)}`, 175, y);
    y += 5;

    doc.text("Tax (GST/VAT):", 135, y);
    doc.text(`$${contract.partAData.tax.toFixed(2)}`, 175, y);
    y += 5;

    doc.setFillColor(220, 38, 38, 0.08);
    doc.rect(130, y - 4, 66, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text("Booking Total:", 135, y);
    doc.text(`$${contract.partAData.total.toFixed(2)}`, 175, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(63, 63, 70);
    y += 5;

    doc.text("Security Deposit Req:", 135, y);
    doc.text(`$${contract.partAData.depositRequired.toFixed(2)}`, 175, y);
    y += 5;

    if (contract.partAData.advancePayment !== undefined) {
      doc.text("Advance Payment Paid:", 135, y);
      doc.text(`$${contract.partAData.advancePayment.toFixed(2)}`, 175, y);
      y += 5;
    }

    y += 3;
  }

  // Draw Page Break if there's both Part A and Part B
  if (contract.partAData && contract.partBData && y > 150) {
    doc.addPage();
    // Top Red Band on Page 2
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 210, 8, 'F');
    y = 20;
  }

  // Render Part B Data
  if (contract.partBData) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text("PART B – HANDOVER & LOGISTICS CHECKLIST", 14, y + 4);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(63, 63, 70);
    doc.text(`Linked Rental ID: ${contract.partBData.rentalId}`, 14, y);
    doc.text(`Actual Handover Date: ${new Date(contract.partBData.actualDeliveryDate).toLocaleDateString()}`, 90, y);
    y += 7;

    // Delivery items table
    doc.setFillColor(82, 82, 91); // Zinc-600
    doc.rect(14, y, 182, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Equipment Variant Name", 16, y + 5);
    doc.text("Handed Over Quantity / Serial Checked", 130, y + 5);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);

    contract.partBData.itemsLoaded.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(244, 244, 245);
        doc.rect(14, y, 182, 6, 'F');
      }
      doc.text(item.name, 16, y + 4);
      doc.text(`${item.quantity} Units`, 130, y + 4);
      y += 6;
    });

    y += 5;

    if (contract.partBData.conditionNotes) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 24, 27);
      doc.text("Handover & Variant Condition Notes:", 14, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(82, 82, 91);
      const conditionLines = doc.splitTextToSize(contract.partBData.conditionNotes, 182);
      conditionLines.forEach((line: string) => {
        doc.text(line, 14, y);
        y += 4.5;
      });
      y += 3;
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text(`Client Acceptance Confirmation: ${contract.partBData.clientAcceptance ? "YES - Equipment inspected and accepted in good order" : "NO"}`, 14, y);
    y += 8;
  }

  // Terms and Signature block
  const defaultTerms = "1. Acceptance: The Customer acknowledges receipt of the equipment listed in Part A/B in good operational condition.\n" +
    "2. Maintenance & Liability: The Customer shall operate the equipment in according to instructions, and is fully liable for any repairs, replacement, or clean up due to abuse or neglect.\n" +
    "3. Overdue Charges: Late returns are calculated automatically at 150% of standard daily rate. All extensions must be requested in writing 24h prior to end date.\n" +
    "4. Cancellation & Security: The security deposit protects against unpaid fees, minor damages or refueling. Balances will be refunded within 5-10 business days post return inspection.";

  const termsText = contract.partAData?.terms || defaultTerms;

  if (y > 180) {
    doc.addPage();
    // Top Red Band on final page
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 210, 8, 'F');
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(220, 38, 38);
  doc.text("LEGAL TERMS & AGREEMENT SPECIFICATIONS", 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  const termsLines = doc.splitTextToSize(termsText, 182);
  termsLines.forEach((line: string) => {
    doc.text(line, 14, y);
    y += 4;
  });

  y += 10;

  // Signatures Lines
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y + 20, 80, y + 20);
  doc.line(120, y + 20, 186, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text("Authorized Redline Officer Signature", 14, y + 24);
  doc.text("Customer Handshake Signature", 120, y + 24);

  if (contract.signatureImageUrl) {
    try {
      doc.addImage(contract.signatureImageUrl, 'PNG', 120, y - 1, 60, 20);
    } catch (err) {
      console.error("Failed to render signature image on PDF:", err);
    }
  }

  if (contract.partAData?.signedAt || contract.partBData?.signedAt) {
    const sDate = contract.partBData?.signedAt || contract.partAData?.signedAt;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Timestamp: ${sDate?.toLocaleString()}`, 120, y + 28);
  }

  return doc.output('blob');
};

export const generateContractPartA = async (bookingId: string): Promise<string> => {
  try {
    const booking = await getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ID ${bookingId} not found.`);
    }

    // Build the Contract Part A Data
    const partAData = {
      bookingId: booking.id,
      startDate: booking.startDate,
      endDate: booking.endDate,
      items: booking.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subtotal: booking.subtotal,
      tax: booking.tax,
      total: booking.total,
      depositRequired: booking.depositAmount,
      advancePayment: booking.advancePayment,
      terms: "1. Security & Booking: A reservation security deposit is required to lock in the rental rate and variant availability.\n" +
        "2. Cancellation Safeguard: Cancellation within 7 days of the scheduled delivery incurs a 25% administrative booking fee. Within 48 hours is non-refundable.\n" +
        "3. Site Conditions: The customer verifies that delivery access site satisfies logistics safety clearance for all equipment dimensions specified."
    };

    const pdfName = `Contract_A_${bookingId}_${Date.now()}.pdf`;

    const newContractDraft: Omit<Contract, 'id'> = {
      rentalId: bookingId, // Use bookingId as temp rentalId reference
      customerId: booking.customerId,
      customerName: booking.customerName,
      contractType: "partA",
      partAData,
      pdfUrl: '',
      pdfName,
      status: "Draft",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generate PDF Blob
    const pdfBlob = await generateContractPdfBlob(newContractDraft);

    // Upload PDF
    const downloadUrl = await uploadContractPdf(pdfBlob, bookingId, pdfName);
    newContractDraft.pdfUrl = downloadUrl;

    // Create contract in collection
    const docRef = await addDoc(contractsCollection, {
      ...newContractDraft,
      partAData: {
        ...partAData,
        startDate: Timestamp.fromDate(partAData.startDate),
        endDate: Timestamp.fromDate(partAData.endDate)
      },
      createdAt: Timestamp.fromDate(newContractDraft.createdAt),
      updatedAt: Timestamp.fromDate(newContractDraft.updatedAt)
    });

    // Update booking with the Part A url
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      contractPartAUrl: downloadUrl,
      updatedAt: Timestamp.fromDate(new Date())
    });

    return docRef.id;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, 'contracts', auth);
    throw error;
  }
};

export const generateContractPartB = async (rentalId: string): Promise<string> => {
  try {
    const rental = await getRental(rentalId);
    if (!rental) {
      throw new Error(`Rental with ID ${rentalId} not found.`);
    }

    const partBData = {
      rentalId: rental.id,
      actualDeliveryDate: rental.startDate,
      itemsLoaded: rental.items.map(i => ({
        name: i.name,
        quantity: i.quantity
      })),
      conditionNotes: "All items loaded, strapped, and fully inspected in operational ready-to-run state. Pre-existing cosmetic scuffs noted, which do not affect functionality.",
      clientAcceptance: true
    };

    const pdfName = `Contract_B_${rentalId}_${Date.now()}.pdf`;

    // Try to see if there's an existing Contract for this customer/rental to merge or update
    const q = query(contractsCollection, where('rentalId', '==', rentalId));
    const querySnapshot = await getDocs(q);

    let contractId = '';
    let updatedContract: Omit<Contract, 'id'>;

    if (!querySnapshot.empty) {
      // Update existing
      const existingDoc = querySnapshot.docs[0];
      const existingData = existingDoc.data();
      contractId = existingDoc.id;

      updatedContract = {
        rentalId,
        customerId: rental.customerId,
        customerName: rental.customerName,
        contractType: "partB", // Switch to Part B or combined
        partAData: existingData.partAData ? {
          ...existingData.partAData,
          startDate: existingData.partAData.startDate?.toDate(),
          endDate: existingData.partAData.endDate?.toDate(),
          signedAt: existingData.partAData.signedAt?.toDate()
        } : undefined,
        partBData,
        pdfUrl: '',
        pdfName,
        status: existingData.status === 'Signed' ? 'Signed' : 'Draft',
        signatureImageUrl: existingData.signatureImageUrl || undefined,
        createdAt: existingData.createdAt?.toDate() || new Date(),
        updatedAt: new Date()
      };
    } else {
      // Create new Part B
      updatedContract = {
        rentalId,
        customerId: rental.customerId,
        customerName: rental.customerName,
        contractType: "partB",
        partBData,
        pdfUrl: '',
        pdfName,
        status: "Draft",
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Generate PDF Blob
    const pdfBlob = await generateContractPdfBlob(updatedContract);
    const downloadUrl = await uploadContractPdf(pdfBlob, rentalId, pdfName);
    updatedContract.pdfUrl = downloadUrl;

    if (contractId) {
      const contractRef = doc(db, 'contracts', contractId);
      await updateDoc(contractRef, {
        contractType: "partB",
        partBData: {
          ...partBData,
          actualDeliveryDate: Timestamp.fromDate(partBData.actualDeliveryDate)
        },
        pdfUrl: downloadUrl,
        pdfName,
        updatedAt: Timestamp.fromDate(updatedContract.updatedAt)
      });
    } else {
      const docRef = await addDoc(contractsCollection, {
        ...updatedContract,
        partBData: {
          ...partBData,
          actualDeliveryDate: Timestamp.fromDate(partBData.actualDeliveryDate)
        },
        createdAt: Timestamp.fromDate(updatedContract.createdAt),
        updatedAt: Timestamp.fromDate(updatedContract.updatedAt)
      });
      contractId = docRef.id;
    }

    // Also update rental with the Part B url
    const rentalRef = doc(db, 'rentals', rentalId);
    await updateDoc(rentalRef, {
      contractPartBUrl: downloadUrl,
      updatedAt: Timestamp.fromDate(new Date())
    });

    return contractId;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, 'contracts', auth);
    throw error;
  }
};

export const generateFullContract = async (rentalId: string): Promise<string> => {
  try {
    const rental = await getRental(rentalId);
    if (!rental) {
      throw new Error(`Rental ID ${rentalId} not found.`);
    }

    // Fetch existing contracts to get Part A and Part B data
    const q = query(contractsCollection, where('rentalId', '==', rentalId));
    const querySnapshot = await getDocs(q);

    let contractId = '';
    let partAData: any = undefined;
    let partBData: any = undefined;
    let signatureImageUrl = '';

    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const data = existingDoc.data();
      contractId = existingDoc.id;
      partAData = data.partAData ? {
        ...data.partAData,
        startDate: data.partAData.startDate?.toDate(),
        endDate: data.partAData.endDate?.toDate(),
        signedAt: data.partAData.signedAt?.toDate()
      } : undefined;
      partBData = data.partBData ? {
        ...data.partBData,
        actualDeliveryDate: data.partBData.actualDeliveryDate?.toDate(),
        actualReturnDate: data.partBData.actualReturnDate?.toDate(),
        signedAt: data.partBData.signedAt?.toDate()
      } : undefined;
      signatureImageUrl = data.signatureImageUrl || '';
    }

    // If Part A data is missing in the contract document, let's look for a booking link or populate from the rental
    if (!partAData) {
      // Fallback from rental data itself
      partAData = {
        bookingId: rentalId,
        startDate: rental.startDate,
        endDate: rental.endDate,
        items: rental.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal: rental.subtotal,
        tax: rental.tax,
        total: rental.total,
        depositRequired: rental.depositAmount,
        advancePayment: rental.advancePayment,
        terms: "Combined Standard Rental Terms of Agreement."
      };
    }

    if (!partBData) {
      partBData = {
        rentalId: rental.id,
        actualDeliveryDate: rental.startDate,
        itemsLoaded: rental.items.map(i => ({
          name: i.name,
          quantity: i.quantity
        })),
        conditionNotes: "All items inspected and delivered under full operations clearance protocols.",
        clientAcceptance: true
      };
    }

    const pdfName = `Contract_Full_${rentalId}_${Date.now()}.pdf`;

    const fullContractData: Omit<Contract, 'id'> = {
      rentalId,
      customerId: rental.customerId,
      customerName: rental.customerName,
      contractType: "full",
      partAData,
      partBData,
      pdfUrl: '',
      pdfName,
      status: "Final",
      signatureImageUrl: signatureImageUrl || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generate combined PDF Blob
    const pdfBlob = await generateContractPdfBlob(fullContractData);
    const downloadUrl = await uploadContractPdf(pdfBlob, rentalId, pdfName);
    fullContractData.pdfUrl = downloadUrl;

    if (contractId) {
      const contractRef = doc(db, 'contracts', contractId);
      await updateDoc(contractRef, {
        contractType: "full",
        partAData: {
          ...partAData,
          startDate: Timestamp.fromDate(partAData.startDate),
          endDate: Timestamp.fromDate(partAData.endDate)
        },
        partBData: {
          ...partBData,
          actualDeliveryDate: Timestamp.fromDate(partBData.actualDeliveryDate)
        },
        pdfUrl: downloadUrl,
        pdfName,
        status: "Final",
        updatedAt: Timestamp.fromDate(fullContractData.updatedAt)
      });
    } else {
      const docRef = await addDoc(contractsCollection, {
        ...fullContractData,
        partAData: {
          ...partAData,
          startDate: Timestamp.fromDate(partAData.startDate),
          endDate: Timestamp.fromDate(partAData.endDate)
        },
        partBData: {
          ...partBData,
          actualDeliveryDate: Timestamp.fromDate(partBData.actualDeliveryDate)
        },
        createdAt: Timestamp.fromDate(fullContractData.createdAt),
        updatedAt: Timestamp.fromDate(fullContractData.updatedAt)
      });
      contractId = docRef.id;
    }

    return contractId;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, 'contracts', auth);
    throw error;
  }
};

export const getContract = async (contractId: string): Promise<Contract | null> => {
  try {
    const docRef = doc(db, 'contracts', contractId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      partAData: data.partAData ? {
        ...data.partAData,
        startDate: data.partAData.startDate?.toDate(),
        endDate: data.partAData.endDate?.toDate(),
        signedAt: data.partAData.signedAt?.toDate()
      } : undefined,
      partBData: data.partBData ? {
        ...data.partBData,
        actualDeliveryDate: data.partBData.actualDeliveryDate?.toDate(),
        actualReturnDate: data.partBData.actualReturnDate?.toDate(),
        signedAt: data.partBData.signedAt?.toDate()
      } : undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as Contract;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.GET, `contracts/${contractId}`, auth);
    throw error;
  }
};

export const getContracts = async (): Promise<Contract[]> => {
  try {
    const snapshot = await getDocs(contractsCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        partAData: data.partAData ? {
          ...data.partAData,
          startDate: data.partAData.startDate?.toDate(),
          endDate: data.partAData.endDate?.toDate(),
          signedAt: data.partAData.signedAt?.toDate()
        } : undefined,
        partBData: data.partBData ? {
          ...data.partBData,
          actualDeliveryDate: data.partBData.actualDeliveryDate?.toDate(),
          actualReturnDate: data.partBData.actualReturnDate?.toDate(),
          signedAt: data.partBData.signedAt?.toDate()
        } : undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Contract;
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, 'contracts', auth);
    throw error;
  }
};

export const getContractsForRental = async (rentalId: string): Promise<Contract[]> => {
  try {
    const q = query(contractsCollection, where('rentalId', '==', rentalId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        partAData: data.partAData ? {
          ...data.partAData,
          startDate: data.partAData.startDate?.toDate(),
          endDate: data.partAData.endDate?.toDate(),
          signedAt: data.partAData.signedAt?.toDate()
        } : undefined,
        partBData: data.partBData ? {
          ...data.partBData,
          actualDeliveryDate: data.partBData.actualDeliveryDate?.toDate(),
          actualReturnDate: data.partBData.actualReturnDate?.toDate(),
          signedAt: data.partBData.signedAt?.toDate()
        } : undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Contract;
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, 'contracts', auth);
    throw error;
  }
};

export const getContractsForBooking = async (bookingId: string): Promise<Contract[]> => {
  try {
    const q = query(contractsCollection, where('partAData.bookingId', '==', bookingId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        partAData: data.partAData ? {
          ...data.partAData,
          startDate: data.partAData.startDate?.toDate(),
          endDate: data.partAData.endDate?.toDate(),
          signedAt: data.partAData.signedAt?.toDate()
        } : undefined,
        partBData: data.partBData ? {
          ...data.partBData,
          actualDeliveryDate: data.partBData.actualDeliveryDate?.toDate(),
          actualReturnDate: data.partBData.actualReturnDate?.toDate(),
          signedAt: data.partBData.signedAt?.toDate()
        } : undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Contract;
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, 'contracts', auth);
    throw error;
  }
};

export const signContract = async (contractId: string, signatureDataUrl: string): Promise<void> => {
  try {
    const contractRef = doc(db, 'contracts', contractId);
    const contractSnap = await getDoc(contractRef);
    if (!contractSnap.exists()) {
      throw new Error(`Contract ${contractId} does not exist.`);
    }

    const currentData = contractSnap.data();

    // Upload Signature string to Firebase Storage
    const signatureRef = ref(storage, `signatures/${contractId}_${Date.now()}.png`);
    await uploadString(signatureRef, signatureDataUrl, 'data_url');
    const signatureImageUrl = await getDownloadURL(signatureRef);

    const signedAt = new Date();

    const updatedData: any = {
      status: "Signed",
      signatureImageUrl,
      updatedAt: Timestamp.fromDate(signedAt)
    };

    if (currentData.partAData) {
      updatedData.partAData = {
        ...currentData.partAData,
        signedAt: Timestamp.fromDate(signedAt)
      };
    }

    if (currentData.partBData) {
      updatedData.partBData = {
        ...currentData.partBData,
        signedAt: Timestamp.fromDate(signedAt)
      };
    }

    await updateDoc(contractRef, updatedData);

    // Regenerate and re-upload PDF with signature embedded
    const fullContract = await getContract(contractId);
    if (fullContract) {
      const pdfBlob = await generateContractPdfBlob(fullContract);
      const downloadUrl = await uploadContractPdf(pdfBlob, fullContract.rentalId, fullContract.pdfName);
      await updateDoc(contractRef, {
        pdfUrl: downloadUrl
      });
    }

  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `contracts/${contractId}`, auth);
    throw error;
  }
};

export const deleteContract = async (contractId: string): Promise<void> => {
  try {
    const contractRef = doc(db, 'contracts', contractId);
    const contractSnap = await getDoc(contractRef);
    if (contractSnap.exists()) {
      const data = contractSnap.data();
      if (data.pdfName && data.rentalId) {
        try {
          const storageRef = ref(storage, `contracts/${data.rentalId}/${data.pdfName}`);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn("Storage PDF delete warning (could be missing):", storageErr);
        }
      }
      if (data.signatureImageUrl) {
        try {
          // Signature cleanup if possible, signature is stored under signatures/
          const sigRef = ref(storage, data.signatureImageUrl);
          await deleteObject(sigRef);
        } catch (sigErr) {
          console.warn("Signature storage delete warning:", sigErr);
        }
      }
    }
    await deleteDoc(contractRef);
  } catch (error: any) {
    handleFirestoreError(error, OperationType.DELETE, `contracts/${contractId}`, auth);
    throw error;
  }
};
