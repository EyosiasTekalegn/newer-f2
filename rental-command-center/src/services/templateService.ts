import { collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface Template {
  id: string;
  name: string;               // e.g., "Rental Contract - Part A", "Quotation Standard", "Invoice Receipt"
  type: "contract" | "quotation" | "invoice";
  subject?: string;           // e.g., "Contract Agreement for Rental {{rentalId}}"
  body: string;               // HTML string with handlebars templates e.g. "Dear {{customerName}}, your total is {{totalAmount}}"
  variables: string[];        // list of supported variables e.g. ["customerName", "rentalId", "totalAmount", "startDate", "endDate"]
  createdAt: Date;
  updatedAt: Date;
}

const templatesCollection = collection(db, 'templates');

const defaultTemplates: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: "Rental Contract Agreement",
    type: "contract",
    subject: "Agreement for Rental Contract #{{rentalId}}",
    body: `
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
  <div style="text-align: center; border-bottom: 2px solid #DC2626; padding-bottom: 15px; margin-bottom: 20px;">
    <h1 style="color: #DC2626; margin: 0; font-size: 28px; text-transform: uppercase;">RENTAL CONTRACT AGREEMENT</h1>
    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">RentalSync Equipment Rentals</p>
  </div>
  
  <p>This document constitutes a binding Rental Contract Agreement between the Rental Provider (RentalSync) and the Customer specified below.</p>
  
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd; width: 30%;">Rental Ref ID:</td>
      <td style="padding: 10px; border: 1px solid #ddd;">{{rentalId}}</td>
    </tr>
    <tr>
      <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Customer Name:</td>
      <td style="padding: 10px; border: 1px solid #ddd;">{{customerName}}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Rental Start Date:</td>
      <td style="padding: 10px; border: 1px solid #ddd;">{{startDate}}</td>
    </tr>
    <tr>
      <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Rental End Date:</td>
      <td style="padding: 10px; border: 1px solid #ddd;">{{endDate}}</td>
    </tr>
    <tr style="background-color: #f9f9f9; font-size: 16px;">
      <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd; color: #DC2626;">Total Rent Due:</td>
      <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #DC2626;">\${{totalAmount}} ETB</td>
    </tr>
  </table>

  <h3 style="color: #111; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">TERMS & CONDITIONS</h3>
  <ol style="padding-left: 20px; font-size: 13px; line-height: 1.6; color: #555;">
    <li>The Lessee shall keep the rental items in a good state of preservation and return them in the same condition.</li>
    <li>Any damage, loss, or inspection failures during return will lead to a charge against the security deposit hold.</li>
    <li>Late returns will attract penalty fees as defined in standard numbering and pricing rules.</li>
  </ol>

  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 45%;">
      <div style="border-bottom: 1px solid #999; height: 50px; margin-bottom: 5px;"></div>
      <p style="margin: 0; font-size: 12px; color: #666;">RentalSync Representative</p>
    </div>
    <div style="text-align: center; width: 45%;">
      <div style="border-bottom: 1px solid #999; height: 50px; margin-bottom: 5px;"></div>
      <p style="margin: 0; font-size: 12px; color: #666;">Customer Signature</p>
    </div>
  </div>
</div>
    `,
    variables: ["rentalId", "customerName", "startDate", "endDate", "totalAmount"]
  },
  {
    name: "Quotation Form",
    type: "quotation",
    subject: "Pricing Quotation for Rental #{{quotationId}}",
    body: `
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
  <div style="text-align: center; border-bottom: 2px solid #555; padding-bottom: 15px; margin-bottom: 20px;">
    <h1 style="color: #333; margin: 0; font-size: 28px; text-transform: uppercase;">PRICING QUOTATION</h1>
    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">Subject to terms & availability</p>
  </div>
  
  <p>Dear <strong>{{customerName}}</strong>,</p>
  <p>Thank you for requesting a quotation from RentalSync. Please find the pricing breakdown below. This offer is valid until <strong>{{validUntil}}</strong>.</p>
  
  <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
    <thead>
      <tr style="background-color: #1A1A1A; color: #fff;">
        <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Item/Description</th>
        <th style="padding: 12px; border: 1px solid #ddd; text-align: right; width: 30%;">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;">Requested Equipment & Logistics (Ref: {{quotationId}})</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: right; font-weight: bold;">\${{totalAmount}} ETB</td>
      </tr>
      <tr style="background-color: #f9f9f9; font-size: 16px;">
        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; text-align: right;">Total Estimated Price:</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #2563EB;">\${{totalAmount}} ETB</td>
      </tr>
    </tbody>
  </table>

  <p style="font-size: 13px; color: #777;">To accept this quotation and convert it into a confirmed booking, please contact our support desk or sign the document online within the validity period.</p>
</div>
    `,
    variables: ["quotationId", "customerName", "validUntil", "totalAmount"]
  },
  {
    name: "Standard Payment Invoice",
    type: "invoice",
    subject: "Payment Receipt Invoice #{{rentalId}}",
    body: `
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #10B981; padding-bottom: 15px; margin-bottom: 20px;">
    <div>
      <h1 style="color: #10B981; margin: 0; font-size: 28px; text-transform: uppercase;">PAID INVOICE</h1>
      <p style="margin: 5px 0 0; color: #666; font-size: 14px;">Invoice ID: INV-{{rentalId}}</p>
    </div>
    <div style="text-align: right;">
      <h2 style="color: #333; margin: 0; font-size: 18px;">RentalSync Ltd.</h2>
      <p style="margin: 3px 0 0; color: #666; font-size: 12px;">Addis Ababa, Ethiopia</p>
    </div>
  </div>
  
  <p>Dear {{customerName}},</p>
  <p>We are pleased to confirm receipt of your payment for rental order #{{rentalId}}. Your ledger balance has been updated accordingly.</p>
  
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd; width: 35%;">Transaction Ref ID:</td>
      <td style="padding: 10px; border: 1px solid #ddd;">{{transactionId}}</td>
    </tr>
    <tr>
      <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Total Rental Amount:</td>
      <td style="padding: 10px; border: 1px solid #ddd;">\${{totalAmount}} ETB</td>
    </tr>
    <tr style="background-color: #ECFDF5; font-size: 16px;">
      <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd; color: #059669;">Amount Paid:</td>
      <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #059669;">\${{amountPaid}} ETB</td>
    </tr>
  </table>

  <div style="text-align: center; margin-top: 35px; border-top: 1px dashed #ddd; padding-top: 15px;">
    <span style="background-color: #D1FAE5; color: #065F46; padding: 6px 15px; border-radius: 9999px; font-weight: bold; font-size: 14px; text-transform: uppercase;">
      ✓ Fully Paid
    </span>
    <p style="margin-top: 10px; font-size: 12px; color: #888;">Thank you for your business!</p>
  </div>
</div>
    `,
    variables: ["rentalId", "customerName", "totalAmount", "transactionId", "amountPaid"]
  }
];

/**
 * Auto-seed templates if collection is empty
 */
const seedDefaultTemplates = async (): Promise<void> => {
  try {
    const snapshot = await getDocs(templatesCollection);
    if (snapshot.empty) {
      for (const tmpl of defaultTemplates) {
        await addDoc(templatesCollection, {
          ...tmpl,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
    }
  } catch (error) {
    console.error("Failed to seed default templates:", error);
  }
};

/**
 * Fetch all templates
 */
export const getTemplates = async (): Promise<Template[]> => {
  try {
    await seedDefaultTemplates();
    const snapshot = await getDocs(templatesCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        subject: data.subject || '',
        body: data.body,
        variables: data.variables || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'templates', auth);
    throw error;
  }
};

/**
 * Save template
 */
export const addTemplate = async (data: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(templatesCollection, {
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'templates', auth);
    throw error;
  }
};

/**
 * Update template
 */
export const updateTemplate = async (id: string, data: Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'templates', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `templates/${id}`, auth);
    throw error;
  }
};

/**
 * Delete template
 */
export const deleteTemplate = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'templates', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `templates/${id}`, auth);
    throw error;
  }
};

/**
 * Render template body by replacing placeholders with actual variables
 */
export const renderTemplate = (body: string, variables: Record<string, any>): string => {
  let rendered = body;
  for (const key of Object.keys(variables)) {
    const value = variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : '';
    // Handle {{key}} or {{ key }}
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, value);
  }
  return rendered;
};
