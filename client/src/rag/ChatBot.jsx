import { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import QuoteForm from '../components/QuoteForm';
import MotorQuoteForm from '../components/MotorQuoteForm';
import LifeQuoteForm from '../components/LifeQuoteForm';
import PremiumBreakdownCard from '../components/PremiumBreakdownCard';
import DocumentUpload from '../components/DocumentUpload';
import './ChatBot.css';

// COMPLETE FILE - Do not modify beyond this point
/* This component provides the PolicyHub insurance chatbot interface */

const BigChip = ({ icon, label, description, onClick }) => (
  <button
    onClick={onClick}
    style={{
      minHeight: "92px",
      width: "100%",
      border: "2px solid rgba(99,102,241,0.5)",
      borderRadius: "16px",
      background: "rgba(99,102,241,0.08)",
      color: "white",
      fontSize: "15px",
      fontWeight: "600",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: "16px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      textAlign: "center",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "rgba(99,102,241,0.4)";
      e.currentTarget.style.transform = "scale(1.03)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "rgba(99,102,241,0.08)";
      e.currentTarget.style.transform = "scale(1)";
    }}
    onMouseDown={e => {
      e.currentTarget.style.transform = "scale(0.97)";
    }}
    onMouseUp={e => {
      e.currentTarget.style.transform = "scale(1)";
    }}
  >
    <span style={{ fontSize: "28px" }}>{icon}</span>
    <span style={{ lineHeight: 1.15, whiteSpace: 'pre-line' }}>{label}</span>
    {description ? (
      <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.85, lineHeight: 1.2 }}>
        {description}
      </span>
    ) : null}
  </button>
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatINR = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const calculateMotorPremium = (formData) => {
  const idv = parseFloat(formData.idv) || 500000;

  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - parseInt(formData.year, 10);
  let odRate = 0.03;
  if (vehicleAge <= 1) odRate = 0.03;
  else if (vehicleAge <= 2) odRate = 0.0325;
  else if (vehicleAge <= 3) odRate = 0.035;
  else if (vehicleAge <= 4) odRate = 0.0375;
  else if (vehicleAge <= 5) odRate = 0.04;
  else odRate = 0.045;

  let odPremium = Math.round(idv * odRate);

  const ncbDiscount = {
    '0%': 0,
    '20%': 0.2,
    '25%': 0.25,
    '35%': 0.35,
    '45%': 0.45,
    '50%': 0.5,
  };
  const ncbAmount = Math.round(odPremium * (ncbDiscount[formData.ncb] || 0));
  odPremium -= ncbAmount;

  const tpPremium = formData.vehicleType === 'Two Wheeler' ? 714 : 2094;

  const addonCosts = {
    'Zero Depreciation': 2500,
    'Engine Guard': 1500,
    'Roadside Assistance': 800,
    'Key Protect': 600,
    'Return to Invoice': 2000,
    'Tyre Cover': 1200,
  };

  const addonTotal = (formData.addons || []).reduce((total, addon) => total + (addonCosts[addon] || 0), 0);

  let basePremium = 0;
  if (formData.insuranceType === 'Comprehensive') {
    basePremium = odPremium + tpPremium + addonTotal;
  } else if (formData.insuranceType === 'Third Party Only') {
    basePremium = tpPremium;
  } else if (formData.insuranceType === 'Own Damage') {
    basePremium = odPremium + addonTotal;
  }

  const gst = Math.round(basePremium * 0.18);
  const total = basePremium + gst;
  const emi = Math.round(total / 12);

  return {
    idv,
    odPremium,
    tpPremium,
    ncbAmount,
    addonTotal,
    basePremium,
    gst,
    total,
    emi,
    vehicleAge,
  };
};

const generateMotorPDF = (quote) => {
  const { formData, premium, quoteId, validUntil } = quote;
  const today = new Date().toLocaleDateString('en-IN');
  const doc = new jsPDF();

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PolicyHub', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Motor Insurance Quote', 15, 27);
  doc.text(`Quote ID: ${quoteId}`, 128, 18);
  doc.text(`Date: ${today}`, 128, 27);

  let y = 50;
  const addSection = (title) => {
    doc.setFillColor(240, 240, 255);
    doc.rect(10, y - 5, 190, 8, 'F');
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, y);
    y += 10;
  };

  const addRow = (label, value) => {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), 100, y);
    y += 8;
  };

  addSection('OWNER INFORMATION');
  addRow('Full Name', formData.name);
  addRow('Mobile', formData.mobile);
  addRow('Email', formData.email || 'Not provided');
  addRow('City', formData.city);
  y += 4;

  addSection('VEHICLE INFORMATION');
  addRow('Vehicle', `${formData.brand} ${formData.model}`.trim());
  addRow('Fuel Type', formData.fuelType);
  addRow('Year of Mfg', formData.year);
  addRow('Registration No', formData.regNo);
  addRow('Insured Value', `INR ${Number(premium.idv).toLocaleString('en-IN')}`);
  addRow('Vehicle Age', `${premium.vehicleAge} Years`);
  addRow('Policy Type', formData.insuranceType);
  y += 4;

  addSection('PREMIUM BREAKDOWN');
  addRow('Own Damage Premium', formatINR(premium.odPremium));
  addRow('Third Party Premium', formatINR(premium.tpPremium));
  addRow('NCB Discount (-)', formatINR(premium.ncbAmount));
  addRow('Add-on Charges', formatINR(premium.addonTotal));
  addRow('Base Premium', formatINR(premium.basePremium));
  addRow('GST @ 18%', formatINR(premium.gst));
  addRow('TOTAL PREMIUM', `${formatINR(premium.total)} / year`);
  addRow('Monthly EMI', `${formatINR(premium.emi)} / month`);
  y += 4;

  addSection('ADD-ONS SELECTED');
  const selectedAddons = formData.addons && formData.addons.length > 0 ? formData.addons : ['None selected'];
  selectedAddons.forEach((addon) => {
    const addonCost = {
      'Zero Depreciation': 2500,
      'Engine Guard': 1500,
      'Roadside Assistance': 800,
      'Key Protect': 600,
      'Return to Invoice': 2000,
      'Tyre Cover': 1200,
    }[addon];
    addRow(addon, addonCost ? `INR ${addonCost.toLocaleString('en-IN')}` : addon);
  });

  y += 2;
  addSection('COVERAGE BENEFITS');
  const benefits = [
    'Own Damage Cover',
    'Third Party Liability',
    'Personal Accident Cover up to INR 15 Lakhs',
    'Theft & Fire Cover',
    'Natural Calamity Cover',
    'Cashless Repairs at 5000+ Garages',
    '24/7 Roadside Assistance',
    'Instant Claim Settlement',
    'Towing Charges up to INR 1,500',
  ];
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  benefits.forEach((benefit) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.text(`- ${benefit}`, 15, y);
    y += 7;
  });

  y += 3;
  addSection('TERMS & CONDITIONS');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const terms = [
    `- Quote valid for 30 days from date of issue: ${validUntil}`,
    '- IDV subject to inspection for old vehicles',
    '- NCB applicable only on own damage premium',
    '- All benefits subject to policy terms',
  ];
  terms.forEach((term) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.text(term, 15, y);
    y += 7;
  });

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 272, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('PolicyHub Insurance | 1800-XXX-XXXX', 15, 282);
  doc.text('www.policyhub.com | support@policyhub.com', 15, 289);
  doc.setFontSize(8);
  doc.text('This is a computer generated quote. No signature required.', 47, 294);

  doc.save(`PolicyHub_Motor_Quote_${quoteId}.pdf`);
};

const calculatePremium = (formData) => {
  const age = Number(formData.age);
  let base = 0;

  if (age <= 25) base = 4500;
  else if (age <= 35) base = 6500;
  else if (age <= 45) base = 9500;
  else if (age <= 55) base = 14000;
  else base = 20000;

  const siMultiplier = {
    '₹3 Lakhs': 0.8,
    '₹5 Lakhs': 1.0,
    '₹10 Lakhs': 1.4,
    '₹15 Lakhs': 1.7,
    '₹25 Lakhs': 2.2,
    '₹50 Lakhs': 3.0,
  };

  const membersMultiplier = { '1': 1, '2': 1.8, '3': 2.4, '4+': 3.0 };

  base *= siMultiplier[formData.sumInsured] || 1;
  base *= membersMultiplier[formData.members] || 1;

  if (formData.preExisting === 'Yes') {
    base *= 1.15;
  }

  const basePremium = Math.round(base);
  const gst = Math.round(basePremium * 0.18);
  const loading = formData.preExisting === 'Yes' ? Math.round(base * 0.05) : 0;
  const total = basePremium + gst + loading;
  const emi = Math.round(total / 12);

  return { basePremium, gst, loading, total, emi };
};

const generateQuotePDF = (quote) => {
  const { formData, premium, quoteId, validUntil } = quote;
  const today = new Date().toLocaleDateString('en-IN');

  const doc = new jsPDF();

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PolicyHub', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Health Insurance Quote', 15, 27);
  doc.text(`Quote ID: ${quoteId}`, 128, 18);
  doc.text(`Date: ${today}`, 128, 27);

  let y = 50;
  const addSection = (title) => {
    doc.setFillColor(240, 240, 255);
    doc.rect(10, y - 5, 190, 8, 'F');
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, y);
    y += 10;
  };

  const addRow = (label, value) => {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), 100, y);
    y += 8;
  };

  addSection('CUSTOMER INFORMATION');
  addRow('Full Name', formData.name);
  addRow('Age', `${formData.age} Years`);
  addRow('Gender', formData.gender);
  addRow('Mobile', formData.mobile);
  addRow('Email', formData.email || 'Not provided');
  addRow('City', formData.city);
  y += 5;

  addSection('PLAN DETAILS');
  addRow('Insurance Type', 'Health Insurance');
  addRow('Plan Name', 'PolicyHub Comprehensive Health Plan');
  addRow('Sum Insured', formData.sumInsured);
  addRow('Policy Term', '1 Year');
  addRow('Number of Members', formData.members);
  addRow('Pre-existing', formData.preExisting);
  y += 5;

  addSection('PREMIUM BREAKDOWN');
  addRow('Base Premium', `INR ${premium.basePremium.toLocaleString('en-IN')}`);
  addRow('GST (18%)', `INR ${premium.gst.toLocaleString('en-IN')}`);
  addRow('Loading Charges', `INR ${premium.loading.toLocaleString('en-IN')}`);

  doc.setFillColor(79, 70, 229);
  doc.rect(10, y - 4, 190, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PREMIUM', 15, y + 4);
  doc.text(`INR ${premium.total.toLocaleString('en-IN')} / year`, 100, y + 4);
  y += 18;
  addRow('Monthly EMI', `INR ${premium.emi.toLocaleString('en-IN')} / month`);
  y += 5;

  addSection('COVERAGE BENEFITS');
  const benefits = [
    'In-patient Hospitalization',
    'Pre & Post Hospitalization (60/90 days)',
    'Daycare Procedures (540+)',
    'OPD Consultations',
    'Ambulance Cover up to INR 5,000',
    'No Claim Bonus up to 50%',
    'Free Annual Health Checkup',
    'Cashless at 10,000+ Hospitals',
    'Mental Health Cover',
    'AYUSH Treatment Cover',
  ];
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  benefits.forEach((benefit) => {
    doc.text(`- ${benefit}`, 15, y);
    y += 7;
  });

  y += 3;
  addSection('TERMS & CONDITIONS');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`- Quote valid for 30 days from date of issue: ${validUntil}`, 15, y); y += 7;
  doc.text('- Final premium may vary after medical underwriting', 15, y); y += 7;
  doc.text('- Pre-existing conditions subject to waiting period', 15, y); y += 7;
  doc.text('- All benefits subject to policy terms', 15, y); y += 10;

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 272, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('PolicyHub Insurance | 1800-XXX-XXXX', 15, 282);
  doc.text('www.policyhub.com | support@policyhub.com', 15, 289);
  doc.setFontSize(8);
  doc.text('This is a computer generated quote. No signature required.', 47, 294);

  doc.save(`PolicyHub_Quote_${quoteId}.pdf`);
};

const calculateLifePremium = (formData) => {
  const sumAssured = parseFloat(String(formData.sumAssured || '1000000').replace(/[^\d.]/g, '')) || 1000000;
  const policyTerm = parseInt(formData.policyTerm, 10) || 20;
  const dob = new Date(formData.dob);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  const planRateTable = {
    'Term Plan': {
      male: { 25: 0.28, 30: 0.35, 35: 0.48, 40: 0.68, 45: 1.05, 50: 1.68, 55: 2.8 },
      female: { 25: 0.2, 30: 0.25, 35: 0.35, 40: 0.5, 45: 0.75, 50: 1.15, 55: 2.0 },
    },
    Endowment: {
      male: { 25: 4.5, 30: 5.2, 35: 6.5, 40: 8.8, 45: 12.5, 50: 18.5, 55: 28.0 },
      female: { 25: 4.0, 30: 4.8, 35: 5.9, 40: 8.0, 45: 11.5, 50: 17.0, 55: 26.0 },
    },
    'Whole Life': {
      male: { 25: 3.8, 30: 4.5, 35: 5.5, 40: 7.5, 45: 10.8, 50: 16.5, 55: 25.5 },
      female: { 25: 3.2, 30: 3.8, 35: 4.75, 40: 6.5, 45: 9.5, 50: 14.5, 55: 23.0 },
    },
    ULIP: {
      male: { 25: 2.5, 30: 2.9, 35: 3.5, 40: 4.8, 45: 7.0, 50: 11.0, 55: 17.5 },
      female: { 25: 2.0, 30: 2.4, 35: 2.9, 40: 4.0, 45: 6.0, 50: 9.5, 55: 15.0 },
    },
  };

  const selectedPlan = planRateTable[formData.planType] || planRateTable['Term Plan'];
  const genderKey = String(formData.gender || '').toLowerCase() === 'female' ? 'female' : 'male';
  const rates = selectedPlan[genderKey] || selectedPlan.male;
  const ageKeys = Object.keys(rates).map(Number).sort((a, b) => a - b);
  const eligibleAge = ageKeys.filter((ageBracket) => ageBracket <= age);
  const baseRate = rates[eligibleAge.length ? eligibleAge[eligibleAge.length - 1] : ageKeys[0]];

  let premiumPerThousand = baseRate;
  const termAdjustment = { 10: 1.15, 15: 1.05, 20: 1.0, 25: 0.95, 30: 0.92 };
  premiumPerThousand *= termAdjustment[policyTerm] || 1.0;

  if (formData.isSmoker === 'Yes') {
    premiumPerThousand *= 1.25;
  }

  let medicalLoading = 1.0;
  if (formData.hasHealthConditions === 'Yes') {
    const conditions = Array.isArray(formData.healthConditions) ? formData.healthConditions : [];
    if (conditions.some((item) => item.toLowerCase().includes('diabetes'))) medicalLoading *= 1.15;
    if (conditions.some((item) => item.toLowerCase().includes('hypertension'))) medicalLoading *= 1.2;
    if (conditions.some((item) => item.toLowerCase().includes('heart'))) medicalLoading *= 1.5;
    if (conditions.some((item) => item.toLowerCase().includes('asthma'))) medicalLoading *= 1.1;
  }
  premiumPerThousand *= medicalLoading;

  const basePremium = Math.round((sumAssured / 100000) * premiumPerThousand * 100);
  const riderRates = {
    'Critical Illness': 5000,
    'Accidental Death': 3000,
    'Waiver of Premium': 2000,
    'Income Protection': 4000,
    'Child Benefit': 2500,
  };

  const riderPremium = (formData.selectedRiders || []).reduce((total, rider) => total + (riderRates[rider] || 0), 0);
  const subtotal = basePremium + riderPremium;
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const emi = Math.round(total / 12);
  const maturityBenefit = formData.planType === 'Endowment'
    ? sumAssured + Math.round(basePremium * 12 * policyTerm * 0.35)
    : 0;

  return {
    sumAssured,
    age,
    basePremium,
    riderPremium,
    subtotal,
    gst,
    total,
    emi,
    maturityBenefit,
    durationInYears: policyTerm,
  };
};

const generateLifePDF = (quote) => {
  const { formData, premium, quoteId, validUntil, planType } = quote;
  const today = new Date().toLocaleDateString('en-IN');
  const dobText = formData.dob ? new Date(formData.dob).toLocaleDateString('en-IN') : 'Not provided';
  const age = Number(formData.age || premium.age || 0);
  const policyTerm = Number(premium.durationInYears || formData.policyTerm || 0);
  const coverageEndAge = age + policyTerm;

  const doc = new jsPDF();
  const pageWidth = 210;

  const drawHeader = () => {
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PolicyHub Life Insurance Quote', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Quote ID: ${quoteId}  |  Date: ${today}`, 14, 26);
  };

  const drawFooter = (footerY = 285) => {
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 272, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('PolicyHub Insurance | 1800-XXX-XXXX', 15, footerY - 3);
    doc.text('www.policyhub.com | support@policyhub.com', 15, footerY + 4);
    doc.setFontSize(8);
    doc.text('Computer generated quote. No signature required.', 50, footerY + 11);
  };

  const addSection = (title, y) => {
    doc.setFillColor(240, 240, 255);
    doc.rect(10, y - 5, 190, 8, 'F');
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, y);
  };

  const addRow = (label, value, y) => {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), 65, y);
  };

  const riderRates = {
    'Critical Illness': 5000,
    'Accidental Death': 3000,
    'Waiver of Premium': 2000,
    'Income Protection': 4000,
    'Child Benefit': 2500,
  };

  drawHeader();
  let y = 48;

  addSection('CUSTOMER INFORMATION', y); y += 10;
  addRow('Full Name', formData.name, y); y += 8;
  addRow('Date of Birth', dobText, y); y += 8;
  addRow('Age', `${age} Years`, y); y += 8;
  addRow('Gender', formData.gender, y); y += 8;
  addRow('Mobile', formData.mobile, y); y += 8;
  addRow('Email', formData.email || 'Not provided', y); y += 8;
  addRow('City', formData.city, y); y += 12;

  addSection('HEALTH INFORMATION', y); y += 10;
  addRow('Occupation', formData.occupation, y); y += 8;
  addRow('Annual Income', formData.annualIncome, y); y += 8;
  addRow('Smoker Status', formData.isSmoker, y); y += 8;
  addRow('Medical Conditions', formData.hasHealthConditions === 'Yes'
    ? (Array.isArray(formData.healthConditions) && formData.healthConditions.length ? formData.healthConditions.join(', ') : 'Yes')
    : 'None', y); y += 8;
  addRow('Family History', formData.familyHistory || 'None', y); y += 12;

  addSection('PLAN DETAILS', y); y += 10;
  addRow('Plan Type', planType, y); y += 8;
  addRow('Sum Assured', formatINR(premium.sumAssured), y); y += 8;
  addRow('Policy Term', `${policyTerm} Years`, y); y += 8;
  addRow('Coverage Period', `Age ${age} to Age ${coverageEndAge}`, y); y += 12;

  addSection('NOMINEE DETAILS', y); y += 10;
  addRow('Nominee Name', formData.nomineeName, y); y += 8;
  addRow('Relationship', formData.nomineeRelation, y); y += 8;
  addRow('Nominee Age', `${formData.nomineeAge} Years`, y); y += 12;

  addSection('PREMIUM BREAKDOWN', y); y += 10;
  addRow('Base Premium', formatINR(premium.basePremium), y); y += 8;
  addRow('Critical Illness', formatINR(formData.selectedRiders?.includes('Critical Illness') ? riderRates['Critical Illness'] : 0), y); y += 8;
  addRow('Accidental Death', formatINR(formData.selectedRiders?.includes('Accidental Death') ? riderRates['Accidental Death'] : 0), y); y += 8;
  addRow('Waiver Premium', formatINR(formData.selectedRiders?.includes('Waiver of Premium') ? riderRates['Waiver of Premium'] : 0), y); y += 8;
  addRow('Income Protection', formatINR(formData.selectedRiders?.includes('Income Protection') ? riderRates['Income Protection'] : 0), y); y += 8;
  addRow('Child Benefit', formatINR(formData.selectedRiders?.includes('Child Benefit') ? riderRates['Child Benefit'] : 0), y); y += 8;
  addRow('Total Add-ons', formatINR(premium.riderPremium), y); y += 8;
  addRow('Subtotal', formatINR(premium.subtotal), y); y += 8;
  addRow('GST @ 18%', formatINR(premium.gst), y); y += 8;
  addRow('TOTAL PREMIUM', `${formatINR(premium.total)} per year`, y); y += 8;
  addRow('Monthly Payment', `${formatINR(premium.emi)} per month`, y); y += 12;

  addSection('BENEFITS SUMMARY', y); y += 10;
  const benefitLines = [
    `Death Benefit: ${formatINR(premium.sumAssured)} payable to nominee`,
    premium.maturityBenefit ? `Maturity Benefit: ${formatINR(premium.maturityBenefit)} (if applicable)` : null,
    'Rider Benefits (as selected)',
    'Free Medical Checkup',
    'Policy Loan Facility',
    'Surrender Value on early exit',
  ].filter(Boolean);
  benefitLines.forEach((line) => {
    doc.text(`✓ ${line}`, 15, y);
    y += 7;
  });
  y += 3;

  addSection('KEY FEATURES', y); y += 10;
  [
    'Easy and fast claim process',
    'No medical test for amount up to ₹25L',
    'Policy loan facility available',
    'Flexible payment modes (annual/monthly)',
    'Grace period for premium payment',
    '30-day free look period',
  ].forEach((line) => {
    doc.text(`- ${line}`, 15, y);
    y += 7;
  });

  y += 3;
  addSection('TERMS & CONDITIONS', y); y += 10;
  [
    `- Quote valid for 30 days from date of issue`,
    '- Final premium may vary based on medical underwriting',
    '- Loadings for smokers/health conditions apply',
    '- Pre-existing conditions as per policy',
    '- All benefits subject to policy terms and conditions',
    '- Nominee can be changed anytime',
  ].forEach((line) => {
    doc.text(line, 15, y);
    y += 7;
  });

  drawFooter();
  doc.save(`PolicyHub_Life_Quote_${quoteId}.pdf`);
};

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hello! 👋 I\'m your Insurance Assistant. Ask me anything about policies, claims, coverage, benefits, and more. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestedChips, setSuggestedChips] = useState(null);
  const [lastQuestion, setLastQuestion] = useState(null);
  const [showLargeChips, setShowLargeChips] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteFormType, setQuoteFormType] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [latestQuote, setLatestQuote] = useState(null);
  const [showUploadUI, setShowUploadUI] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [motorSelections, setMotorSelections] = useState({ vehicleType: '', insuranceType: '' });
  const [lifeSelections, setLifeSelections] = useState({ planType: '', sumAssured: '', policyTerm: '' });
  const [lifeCustomAmount, setLifeCustomAmount] = useState('');
  const [showLifeCustomAmountInput, setShowLifeCustomAmountInput] = useState(false);
  const messagesEndRef = useRef(null);

  const normalizeRagResponse = (data) => ({
    answer: data?.answer || '',
    sources: Array.isArray(data?.sources) ? data.sources : [],
    llmComparison: data?.llm_comparison || data?.llmComparison || {},
  });

  const buildBotMessage = (data, timestamp = new Date()) => ({
    id: Date.now(),
    type: 'bot',
    text: data.answer,
    sources: data.sources,
    llmComparison: data.llmComparison,
    timestamp,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chipFlows = {
    welcome: {
      chips: ['🏥 Health Insurance', '🚗 Motor Insurance', '🛡️ Life Insurance', '❓ FAQ'],
      isLarge: false,
    },
    healthActions: {
      chips: [
        { icon: '💰', label: 'Get a Quote' },
        { icon: '📋', label: 'Claim Form\nFill Up' },
        { icon: '❓', label: 'General Enquiry' },
        { icon: '🏠', label: 'Back to\nMain Menu' },
      ],
      isLarge: true,
      columns: 2,
    },
    lifeActions: {
      chips: [
        { icon: '💰', label: 'Get a Quote' },
        { icon: '📋', label: 'Claim Form\nFill Up' },
        { icon: '❓', label: 'General Enquiry' },
        { icon: '🏠', label: 'Back to\nMain Menu' },
      ],
      isLarge: true,
      columns: 2,
    },
    lifePlanTypes: {
      chips: [
        { icon: '📅', label: 'Term\nPlan', description: 'Pure life cover at lowest premium' },
        { icon: '💎', label: 'Endowment\nPlan', description: 'Life cover + maturity benefit' },
        { icon: '💰', label: 'Whole Life\nPlan', description: 'Lifelong protection + cash value' },
        { icon: '🎯', label: 'ULIP\n(Variable)', description: 'Flexible investment + life cover' },
      ],
      isLarge: true,
      columns: 2,
    },
    lifeCoverageAmounts: {
      chips: [
        { icon: '₹', label: '₹25 L\n25 Lakh' },
        { icon: '₹', label: '₹50 L\n50 Lakh' },
        { icon: '₹', label: '₹75 L\n75 Lakh' },
        { icon: '₹', label: '₹1 Cr\n1 Crore' },
        { icon: '✏️', label: 'Custom\nAmount', description: 'Enter your own sum assured' },
      ],
      isLarge: true,
      columns: 3,
    },
    lifeTermDurations: {
      chips: ['10 Years', '15 Years', '20 Years', '25 Years', '30 Years'],
      isLarge: false,
    },
    lifeClaimFollowUp: {
      chips: ['💀 Death Claim', '🦴 Accidental Death', '🔄 Maturity Claim', '🔙 Back to Life'],
      isLarge: false,
    },
    lifeEnquiryFollowUp: {
      chips: ['What is Term Plan?', 'Endowment vs ULIP?', 'Why Life Insurance?', '🔙 Back to Life'],
      isLarge: false,
    },
    motorActions: {
      chips: [
        { icon: '💰', label: 'Get a Quote' },
        { icon: '📋', label: 'Claim\nForm Fill Up' },
        { icon: '❓', label: 'General Enquiry' },
        { icon: '🏠', label: 'Back to\nMain Menu' },
      ],
      isLarge: true,
      columns: 2,
    },
    motorVehicleType: {
      chips: [
        { icon: '🚗', label: 'Private\nCar' },
        { icon: '🚌', label: 'Commercial\nVehicle' },
        { icon: '🏍️', label: 'Two\nWheeler' },
        { icon: '🚜', label: 'Tractor /\nAgri Vehicle' },
      ],
      isLarge: true,
      columns: 2,
    },
    motorInsuranceTypes: {
      chips: [
        {
          icon: '🛡️',
          label: 'Comprehensive',
          description: 'Full coverage - own damage + third party',
        },
        {
          icon: '🔰',
          label: 'Third Party Only',
          description: 'Mandatory by law - covers third party only',
        },
        {
          icon: '➕',
          label: 'Own Damage',
          description: 'Covers your vehicle damage only',
        },
      ],
      isLarge: true,
      columns: 3,
    },
    quoteFollowUp: {
      chips: ['📧 Email My Quote', '📞 Talk to Agent', '🔄 Recalculate', '🏠 Main Menu'],
      isLarge: false,
    },
    quoteCardActions: {
      chips: [
        { icon: '📄', label: 'Download\nQuote PDF' },
        { icon: '💳', label: 'Buy This\nPlan' },
        { icon: '🔄', label: 'Recalculate' },
        { icon: '📞', label: 'Talk to\nAgent' },
      ],
      isLarge: true,
      columns: 2,
    },
    pdfFollowUp: {
      chips: ['💳 Buy This Plan', '📞 Talk to Agent', '🔄 New Quote', '🏠 Main Menu'],
      isLarge: false,
    },
    motorClaimFollowUp: {
      chips: ['🚗 Accident Claim', '🔥 Fire / Theft Claim', '🌊 Natural Calamity', '🔙 Back to Motor'],
      isLarge: false,
    },
    motorEnquiryFollowUp: {
      chips: ['What is IDV?', 'What is NCB?', 'Cashless Garages', '🔙 Back to Motor'],
      isLarge: false,
    },
    claimFollowUp: {
      chips: ['Cashless Claim', 'Reimbursement Claim', 'Emergency Claim', '🔙 Back to Health'],
      isLarge: false,
    },
    enquiryFollowUp: {
      chips: ['Coverage Details', 'Waiting Period', 'Network Hospitals', '🔙 Back to Health'],
      isLarge: false,
    },
    error: {
      chips: ['🔄 Try Again', '📞 Talk to Agent', '🏠 Main Menu'],
      isLarge: false,
    },
  };

  const getFollowUpChips = (chipLabel) => {
    const label = chipLabel.toLowerCase().trim();

    if (label.includes('get a quote')) {
      if (activeProduct === 'motor') return chipFlows.motorVehicleType;
      if (activeProduct === 'life') return chipFlows.lifePlanTypes;
      return chipFlows.quoteFollowUp;
    }

    if (label.includes('claim form') || label.includes('accident claim') || label.includes('fire / theft claim') || label.includes('natural calamity')) {
      if (activeProduct === 'motor') return chipFlows.motorClaimFollowUp;
      if (activeProduct === 'life') return chipFlows.lifeClaimFollowUp;
      return chipFlows.claimFollowUp;
    }

    if (label.includes('general enquiry') || label.includes('what is idv') || label.includes('what is ncb') || label.includes('cashless garages')) {
      if (activeProduct === 'motor') return chipFlows.motorEnquiryFollowUp;
      if (activeProduct === 'life') return chipFlows.lifeEnquiryFollowUp;
      return chipFlows.enquiryFollowUp;
    }

    if (label.includes('back to motor')) return chipFlows.motorActions;
    if (label.includes('back to life')) return chipFlows.lifeActions;
    if (label.includes('back to health')) return chipFlows.healthActions;
    if (label.includes('back to main menu') || label.includes('main menu')) return chipFlows.welcome;
    if (label.includes('faq')) return chipFlows.enquiryFollowUp;

    return null;
  };

  const queryRAGBackend = async (question) => {
    console.log('[CHATBOT] Querying RAG via Express proxy with question:', question);

    try {
      const response = await api.post('/chat', { question: question.trim() });

      console.log('[CHATBOT] Got response from RAG:', response.data);

      if (!response.data.answer) {
        throw new Error('No answer in response');
      }

      return normalizeRagResponse(response.data);
    } catch (err) {
      console.error('[CHATBOT] Error querying RAG:', err.message);

      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        throw new Error('Request timeout - the server is not responding. Please try again.');
      }

      if (err instanceof TypeError || err.message.includes('Network Error')) {
        throw new Error('Cannot connect to the chat backend. Please ensure the server is running.');
      }

      throw new Error(err.response?.data?.message || err.message || 'Failed to get response from RAG');
    }
  };

  const appendBotMessages = async (items, nextChips = null, options = {}) => {
    setLoading(true);
    await wait(options.typingDelayMs || 850);

    const timestamp = new Date();
    setMessages((prev) => [
      ...prev,
      ...items.map((item, index) => ({
        id: Date.now() + index,
        type: 'bot',
        timestamp,
        ...item,
      })),
    ]);

    if (nextChips) {
      setSuggestedChips(nextChips);
      setShowLargeChips(Boolean(nextChips.isLarge));
    } else {
      setSuggestedChips(null);
      setShowLargeChips(false);
    }

    setLoading(false);
  };

  const submitLifeCustomAmount = async () => {
    const digits = String(lifeCustomAmount).replace(/[^\d]/g, '');
    const amount = Number(digits);

    if (!amount || amount < 2500000) {
      setError('Enter a valid custom amount of at least ₹25,00,000.');
      return;
    }

    setError('');
    setShowLifeCustomAmountInput(false);
    setLifeSelections((prev) => ({
      ...prev,
      sumAssured: String(amount),
    }));

    await appendBotMessages(
      [{ text: 'Got it! How long would you like the coverage for?' }],
      chipFlows.lifeTermDurations,
    );
  };

  const openQuoteForm = (type) => {
    setQuoteFormType(type);
    setShowQuoteForm(true);
  };

  const closeQuoteForm = () => {
    setShowQuoteForm(false);
    setQuoteFormType(null);
  };

  const handleLifeQuoteFormSubmit = async (formData) => {
    setFormLoading(true);
    closeQuoteForm();

    try {
      const dob = new Date(formData.dob);
      let age = new Date().getFullYear() - dob.getFullYear();
      const monthDiff = new Date().getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < dob.getDate())) {
        age -= 1;
      }

      const mergedFormData = {
        ...formData,
        age,
        planType: lifeSelections.planType,
        sumAssured: lifeSelections.sumAssured,
        policyTerm: lifeSelections.policyTerm,
      };

      const premium = calculateLifePremium(mergedFormData);
      const quoteId = `LQ-2024-${Date.now().toString().slice(-4)}`;
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');

      const quotePayload = {
        quoteType: 'life',
        formData: mergedFormData,
        premium,
        quoteId,
        validUntil,
        planType: lifeSelections.planType,
      };

      setLatestQuote(quotePayload);

      await appendBotMessages(
        [
          { text: "Here's your Life Insurance Quote! 🎉 Please review the details below." },
          { cardType: 'premium-breakdown', quote: quotePayload },
        ],
        chipFlows.quoteCardActions,
      );

      setError('');
    } catch (err) {
      console.error('[CHATBOT] Error generating life quote:', err);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          text: 'Sorry, I couldn\'t generate your life quote right now. Please try again or contact support.',
          timestamp: new Date(),
        },
      ]);
      setSuggestedChips(chipFlows.error);
      setShowLargeChips(false);
      setError(err.message || 'Failed to generate life quote');
      setShowQuoteForm(true);
      setQuoteFormType('life');
    } finally {
      setFormLoading(false);
    }
  };

  const handleQuoteFormSubmit = async (formData) => {
    setFormLoading(true);
    closeQuoteForm();

    try {
      const premium = calculatePremium(formData);
      const quoteId = `HQ-2024-${Date.now().toString().slice(-4)}`;
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');
      const planType = formData.members === '1' ? 'Individual' : 'Family';

      const quotePayload = {
        quoteType: 'health',
        formData,
        premium,
        quoteId,
        validUntil,
        planType,
      };

      setLatestQuote(quotePayload);

      await appendBotMessages(
        [
          { text: "Here's your personalized Health Insurance Quote! 🎉 Please review the details below." },
          { cardType: 'premium-breakdown', quote: quotePayload },
        ],
        chipFlows.quoteCardActions,
      );

      setError('');
    } catch (err) {
      console.error('[CHATBOT] Error generating health quote:', err);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          text: 'Sorry, I couldn\'t generate your quote right now. Please try again or contact support.',
          timestamp: new Date(),
        },
      ]);
      setSuggestedChips(chipFlows.error);
      setShowLargeChips(false);
      setError(err.message || 'Failed to generate quote');
      setShowQuoteForm(true);
      setQuoteFormType('health');
    } finally {
      setFormLoading(false);
    }
  };

  const handleMotorQuoteFormSubmit = async (formData) => {
    setFormLoading(true);
    closeQuoteForm();

    try {
      const premium = calculateMotorPremium(formData);
      const quoteId = `MQ-2024-${Date.now().toString().slice(-4)}`;
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');

      const quotePayload = {
        quoteType: 'motor',
        formData,
        premium,
        quoteId,
        validUntil,
      };

      setLatestQuote(quotePayload);

      await appendBotMessages(
        [
          { text: "Here's your Motor Insurance Quote! 🚗🎉 Please review the details below." },
          { cardType: 'premium-breakdown', quote: quotePayload },
        ],
        chipFlows.quoteCardActions,
      );

      setError('');
    } catch (err) {
      console.error('[CHATBOT] Error generating motor quote:', err);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          text: 'Sorry, I couldn\'t generate your motor quote right now. Please try again or contact support.',
          timestamp: new Date(),
        },
      ]);
      setSuggestedChips(chipFlows.error);
      setShowLargeChips(false);
      setError(err.message || 'Failed to generate motor quote');
      setShowQuoteForm(true);
      setQuoteFormType('motor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleChipClick = async (chipText) => {
    const chipLowerCase = chipText.toLowerCase().trim();
    const normalizedChip = chipText.replace(/\s+/g, ' ').trim();

    if (chipLowerCase.includes('health') && !chipLowerCase.includes('back')) {
      setActiveProduct('health');
      await appendBotMessages(
        [{ text: 'Great! 🏥 I can help you with your Health Insurance. What would you like to do today?' }],
        chipFlows.healthActions,
      );
      closeQuoteForm();
      return;
    }

    if (chipLowerCase.includes('motor') && !chipLowerCase.includes('back')) {
      setActiveProduct('motor');
      await appendBotMessages(
        [{ text: 'Great! 🚗 I can help you with Motor Insurance. What would you like to do today?' }],
        chipFlows.motorActions,
      );
      closeQuoteForm();
      return;
    }

    if (chipLowerCase.includes('life') && !chipLowerCase.includes('back')) {
      setActiveProduct('life');
      setShowLifeCustomAmountInput(false);
      await appendBotMessages(
        [{ text: 'Secure your family\'s future! 🛡️ I can help you with Life Insurance. What would you like to do today?' }],
        chipFlows.lifeActions,
      );
      closeQuoteForm();
      return;
    }

    if (chipLowerCase.includes('get a quote')) {
      if (activeProduct === 'motor') {
        await appendBotMessages(
          [{ text: "Sure! 🚗 Let's get your vehicle insured. First, what type of vehicle do you own?" }],
          chipFlows.motorVehicleType,
        );
        return;
      }

      if (activeProduct === 'life') {
        setLifeSelections({ planType: '', sumAssured: '', policyTerm: '' });
        setShowLifeCustomAmountInput(false);
        await appendBotMessages(
          [{ text: "Great! 🛡️ Let's find the perfect life insurance plan for you. What type of plan are you interested in?" }],
          chipFlows.lifePlanTypes,
        );
        return;
      }

      setActiveProduct('health');
      await appendBotMessages(
        [{ text: '📋 Sure! Let me collect some basic details to generate your personalized Health Insurance quote.' }],
        null,
      );
      openQuoteForm('health');
      return;
    }

    if (
      activeProduct === 'motor' &&
      (
        chipLowerCase.includes('private car') ||
        chipLowerCase.includes('commercial vehicle') ||
        chipLowerCase.includes('two wheeler') ||
        chipLowerCase.includes('tractor / agri vehicle')
      )
    ) {
      const vehicleType = chipLowerCase.includes('private car')
        ? 'Private Car'
        : chipLowerCase.includes('commercial vehicle')
          ? 'Commercial Vehicle'
          : chipLowerCase.includes('two wheeler')
            ? 'Two Wheeler'
            : 'Tractor / Agri Vehicle';

      setMotorSelections((prev) => ({
        ...prev,
        vehicleType,
      }));

      await appendBotMessages(
        [{ text: 'Got it! 🚗 What type of insurance are you looking for?' }],
        chipFlows.motorInsuranceTypes,
      );
      return;
    }

    if (
      activeProduct === 'motor' &&
      (
        chipLowerCase.includes('comprehensive') ||
        chipLowerCase.includes('third party only') ||
        chipLowerCase.includes('own damage')
      )
    ) {
      const insuranceType = chipLowerCase.includes('comprehensive')
        ? 'Comprehensive'
        : chipLowerCase.includes('third party only')
          ? 'Third Party Only'
          : 'Own Damage';

      setMotorSelections((prev) => ({
        ...prev,
        insuranceType,
      }));

      await appendBotMessages(
        [{ text: 'Perfect! 📋 Let me collect your vehicle details to generate your Motor Insurance quote.' }],
        null,
      );
      openQuoteForm('motor');
      return;
    }

    if (
      activeProduct === 'life' &&
      (
        chipLowerCase.includes('term plan') ||
        chipLowerCase.includes('endowment plan') ||
        chipLowerCase.includes('whole life plan') ||
        chipLowerCase.includes('ulip')
      )
    ) {
      const planType = chipLowerCase.includes('term plan')
        ? 'Term Plan'
        : chipLowerCase.includes('endowment plan')
          ? 'Endowment'
          : chipLowerCase.includes('whole life plan')
            ? 'Whole Life'
            : 'ULIP';

      setLifeSelections((prev) => ({
        ...prev,
        planType,
      }));
      setShowLifeCustomAmountInput(false);

      await appendBotMessages(
        [{ text: 'Perfect! How much life cover do you need? (Sum Assured is the amount your family gets)' }],
        chipFlows.lifeCoverageAmounts,
      );
      return;
    }

    if (activeProduct === 'life' && chipLowerCase.includes('custom amount')) {
      setShowLifeCustomAmountInput(true);
      await appendBotMessages(
        [{ text: 'Please enter your custom sum assured below.' }],
        chipFlows.lifeCoverageAmounts,
      );
      return;
    }

    if (
      activeProduct === 'life' &&
      (
        chipLowerCase.includes('₹25 l') ||
        chipLowerCase.includes('₹50 l') ||
        chipLowerCase.includes('₹75 l') ||
        chipLowerCase.includes('₹1 cr') ||
        chipLowerCase.includes('₹2 cr')
      )
    ) {
      const amount = chipLowerCase.includes('₹25 l')
        ? '2500000'
        : chipLowerCase.includes('₹50 l')
          ? '5000000'
          : chipLowerCase.includes('₹75 l')
            ? '7500000'
            : chipLowerCase.includes('₹1 cr')
              ? '10000000'
              : '20000000';

      setLifeSelections((prev) => ({
        ...prev,
        sumAssured: amount,
      }));
      setShowLifeCustomAmountInput(false);

      await appendBotMessages(
        [{ text: 'Got it! How long would you like the coverage for?' }],
        chipFlows.lifeTermDurations,
      );
      return;
    }

    if (activeProduct === 'life' && (chipLowerCase.includes('10 years') || chipLowerCase.includes('15 years') || chipLowerCase.includes('20 years') || chipLowerCase.includes('25 years') || chipLowerCase.includes('30 years'))) {
      const policyTerm = chipLowerCase.includes('10 years')
        ? '10'
        : chipLowerCase.includes('15 years')
          ? '15'
          : chipLowerCase.includes('20 years')
            ? '20'
            : chipLowerCase.includes('25 years')
              ? '25'
              : '30';

      setLifeSelections((prev) => ({
        ...prev,
        policyTerm,
      }));
      setShowLifeCustomAmountInput(false);

      await appendBotMessages(
        [{ text: 'Excellent! 📋 Let me collect your personal details to generate your Life Insurance quote.' }],
        null,
      );
      openQuoteForm('life');
      return;
    }

    if (chipLowerCase.includes('claim form fill up') || chipLowerCase === 'claim form fill up') {
      if (activeProduct === 'motor') {
        await appendBotMessages(
          [{ text: 'Let\'s help you file your motor claim. What type of claim do you want to raise?' }],
          chipFlows.motorClaimFollowUp,
        );
        return;
      }

      if (activeProduct === 'life') {
        await appendBotMessages(
          [{ text: 'I\'m sorry for your loss. Let me help you file the life insurance claim smoothly.' }],
          chipFlows.lifeClaimFollowUp,
        );
        return;
      }

      await appendBotMessages(
        [{ text: 'Let\'s help you with your claim. Which option do you want to explore?' }],
        chipFlows.claimFollowUp,
      );
      return;
    }

    if (chipLowerCase.includes('general enquiry')) {
      if (activeProduct === 'motor') {
        setSuggestedChips(null);
        setShowLargeChips(false);
        setLoading(true);
        const userMsg = { id: Date.now(), type: 'user', text: normalizedChip, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setLastQuestion(normalizedChip);

        try {
          const ragResponse = await queryRAGBackend('Motor insurance general enquiry');
          await wait(400);
          setMessages((prev) => [
            ...prev,
            buildBotMessage(ragResponse, new Date()),
          ]);
          setSuggestedChips(chipFlows.motorEnquiryFollowUp);
          setShowLargeChips(false);
          setError('');
        } catch (err) {
          console.error('[CHATBOT] Error:', err);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              type: 'bot',
              text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
              timestamp: new Date(),
            },
          ]);
          setSuggestedChips(chipFlows.error);
          setShowLargeChips(false);
          setError(err.message || 'Failed to get response');
        } finally {
          setLoading(false);
        }
        return;
      }

      if (activeProduct === 'life') {
        setSuggestedChips(null);
        setShowLargeChips(false);
        setLoading(true);
        const userMsg = { id: Date.now(), type: 'user', text: normalizedChip, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setLastQuestion(normalizedChip);

        try {
          const ragResponse = await queryRAGBackend('Life insurance general enquiry');
          await wait(400);
          setMessages((prev) => [...prev, buildBotMessage(ragResponse, new Date())]);
          setSuggestedChips(chipFlows.lifeEnquiryFollowUp);
          setShowLargeChips(false);
          setError('');
        } catch (err) {
          console.error('[CHATBOT] Error:', err);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              type: 'bot',
              text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
              timestamp: new Date(),
            },
          ]);
          setSuggestedChips(chipFlows.error);
          setShowLargeChips(false);
          setError(err.message || 'Failed to get response');
        } finally {
          setLoading(false);
        }
        return;
      }

      setSuggestedChips(null);
      setShowLargeChips(false);
      setLoading(true);
      const userMsg = { id: Date.now(), type: 'user', text: normalizedChip, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setLastQuestion(normalizedChip);

      try {
        const ragResponse = await queryRAGBackend(normalizedChip);
        await wait(400);
        setMessages((prev) => [
          ...prev,
          buildBotMessage(ragResponse, new Date()),
        ]);
        setSuggestedChips(chipFlows.enquiryFollowUp);
        setShowLargeChips(false);
        setError('');
      } catch (err) {
        console.error('[CHATBOT] Error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
            timestamp: new Date(),
          },
        ]);
        setSuggestedChips(chipFlows.error);
        setShowLargeChips(false);
        setError(err.message || 'Failed to get response');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (activeProduct === 'life' && (chipLowerCase.includes('what is term plan') || chipLowerCase.includes('endowment vs ulip') || chipLowerCase.includes('why life insurance'))) {
      setSuggestedChips(null);
      setShowLargeChips(false);
      setLoading(true);
      const userMsg = { id: Date.now(), type: 'user', text: normalizedChip, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setLastQuestion(normalizedChip);

      try {
        const ragResponse = await queryRAGBackend(normalizedChip);
        await wait(400);
        setMessages((prev) => [...prev, buildBotMessage(ragResponse, new Date())]);
        setSuggestedChips(chipFlows.lifeEnquiryFollowUp);
        setShowLargeChips(false);
        setError('');
      } catch (err) {
        console.error('[CHATBOT] Error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
            timestamp: new Date(),
          },
        ]);
        setSuggestedChips(chipFlows.error);
        setShowLargeChips(false);
        setError(err.message || 'Failed to get response');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (activeProduct === 'life' && (chipLowerCase.includes('death claim') || chipLowerCase.includes('accidental death') || chipLowerCase.includes('maturity claim'))) {
      setSuggestedChips(null);
      setShowLargeChips(false);
      setLoading(true);
      const userMsg = { id: Date.now(), type: 'user', text: normalizedChip, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setLastQuestion(normalizedChip);

      try {
        const ragResponse = await queryRAGBackend(`${normalizedChip} life insurance claim process`);
        await wait(400);
        setMessages((prev) => [...prev, buildBotMessage(ragResponse, new Date())]);
        setSuggestedChips(chipFlows.lifeClaimFollowUp);
        setShowLargeChips(false);
        setError('');
      } catch (err) {
        console.error('[CHATBOT] Error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
            timestamp: new Date(),
          },
        ]);
        setSuggestedChips(chipFlows.error);
        setShowLargeChips(false);
        setError(err.message || 'Failed to get response');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (chipLowerCase.includes('what is idv') || chipLowerCase.includes('what is ncb') || chipLowerCase.includes('cashless garages')) {
      setSuggestedChips(null);
      setShowLargeChips(false);
      setLoading(true);
      const userMsg = { id: Date.now(), type: 'user', text: normalizedChip, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setLastQuestion(normalizedChip);

      try {
        const ragResponse = await queryRAGBackend(`${normalizedChip} motor insurance`);
        await wait(400);
        setMessages((prev) => [
          ...prev,
          buildBotMessage(ragResponse, new Date()),
        ]);
        setSuggestedChips(chipFlows.motorEnquiryFollowUp);
        setShowLargeChips(false);
        setError('');
      } catch (err) {
        console.error('[CHATBOT] Error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
            timestamp: new Date(),
          },
        ]);
        setSuggestedChips(chipFlows.error);
        setShowLargeChips(false);
        setError(err.message || 'Failed to get response');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (chipLowerCase.includes('accident claim') || chipLowerCase.includes('fire / theft claim') || chipLowerCase.includes('natural calamity')) {
      setSuggestedChips(null);
      setShowLargeChips(false);
      setLoading(true);
      const userMsg = { id: Date.now(), type: 'user', text: normalizedChip, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setLastQuestion(normalizedChip);

      try {
        const ragResponse = await queryRAGBackend(`${normalizedChip} motor insurance claim process`);
        await wait(400);
        setMessages((prev) => [
          ...prev,
          buildBotMessage(ragResponse, new Date()),
        ]);
        setSuggestedChips(chipFlows.motorClaimFollowUp);
        setShowLargeChips(false);
        setError('');
      } catch (err) {
        console.error('[CHATBOT] Error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
            timestamp: new Date(),
          },
        ]);
        setSuggestedChips(chipFlows.error);
        setShowLargeChips(false);
        setError(err.message || 'Failed to get response');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (chipLowerCase.includes('download quote pdf') || chipLowerCase === 'download quote pdf') {
      if (!latestQuote) {
        setError('No quote details found to download. Please generate a quote first.');
        return;
      }

      if (latestQuote.quoteType === 'life') {
        generateLifePDF(latestQuote);
      } else if (latestQuote.quoteType === 'motor') {
        generateMotorPDF(latestQuote);
      } else {
        generateQuotePDF(latestQuote);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          text: latestQuote.quoteType === 'motor'
            ? `✅ Your Motor Insurance Quote PDF has been downloaded successfully! Quote ID: ${latestQuote.quoteId} Valid for 30 days. Ready to proceed?`
            : latestQuote.quoteType === 'life'
              ? `✅ Your Life Insurance Quote PDF has been downloaded successfully!\nQuote ID: ${latestQuote.quoteId}\nValid for 30 days.\nReady to buy this plan?`
            : `✅ Your quote PDF has been downloaded successfully! Quote ID: ${latestQuote.quoteId} Valid for 30 days. Ready to proceed with buying this plan?`,
          timestamp: new Date(),
        },
      ]);

      setSuggestedChips(chipFlows.pdfFollowUp);
      setShowLargeChips(false);
      return;
    }

    if (chipLowerCase.includes('buy this plan')) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          text: 'Great choice! 💳 To complete the purchase please upload the required documents (ID, KYC, signed form).',
          timestamp: new Date(),
        },
      ]);
      // Show inline upload UI tied to the latest quote
      setShowUploadUI(true);
      setSuggestedChips(null);
      setShowLargeChips(false);
      return;
    }

    if (chipLowerCase.includes('recalculate') || chipLowerCase.includes('new quote')) {
      if (latestQuote?.quoteType === 'life' || activeProduct === 'life') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'bot',
            text: 'Sure, let us recalculate your life quote. Please update your details below.',
            timestamp: new Date(),
          },
        ]);
        setLifeSelections((prev) => ({
          planType: prev.planType || latestQuote?.planType || '',
          sumAssured: prev.sumAssured || latestQuote?.formData?.sumAssured || '',
          policyTerm: prev.policyTerm || latestQuote?.formData?.policyTerm || '',
        }));
        setActiveProduct('life');
        openQuoteForm('life');
      } else if (latestQuote?.quoteType === 'motor' || activeProduct === 'motor') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'bot',
            text: 'Sure, let us recalculate your motor quote. Please update your vehicle details below.',
            timestamp: new Date(),
          },
        ]);
        setMotorSelections((prev) => ({
          vehicleType: prev.vehicleType || latestQuote?.formData?.vehicleType || '',
          insuranceType: prev.insuranceType || latestQuote?.formData?.insuranceType || '',
        }));
        setActiveProduct('motor');
        openQuoteForm('motor');
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'bot',
            text: 'Sure, let us recalculate your quote. Please update your details below.',
            timestamp: new Date(),
          },
        ]);
        setActiveProduct('health');
        openQuoteForm('health');
      }

      setSuggestedChips(null);
      setShowLargeChips(false);
      return;
    }

    if (chipLowerCase.includes('email')) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          text: '✉️ Quote has been sent to your email! You can review and purchase anytime.',
          timestamp: new Date(),
        },
      ]);
      setSuggestedChips(chipFlows.welcome);
      setShowLargeChips(false);
      return;
    }

    if (chipText.includes('📞 Talk to Agent')) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          text: 'Our support team will connect with you shortly. Please provide your contact details.',
          timestamp: new Date(),
        },
      ]);
      setSuggestedChips(chipFlows.welcome);
      setShowLargeChips(false);
      return;
    }

    if (chipText.includes('🔄 Try Again')) {
      if (lastQuestion) {
        await handleChipClick(lastQuestion);
      }
      return;
    }

    if (chipLowerCase.includes('back to motor')) {
      setActiveProduct('motor');
      setSuggestedChips(chipFlows.motorActions);
      setShowLargeChips(true);
      closeQuoteForm();
      return;
    }

    if (chipLowerCase.includes('back to health')) {
      setActiveProduct('health');
      setSuggestedChips(chipFlows.healthActions);
      setShowLargeChips(true);
      closeQuoteForm();
      return;
    }

    if (chipLowerCase.includes('back to main menu') || chipLowerCase.includes('main menu')) {
      setActiveProduct(null);
      setMotorSelections({ vehicleType: '', insuranceType: '' });
      setLifeSelections({ planType: '', sumAssured: '', policyTerm: '' });
      setShowLifeCustomAmountInput(false);
      setLifeCustomAmount('');
      setSuggestedChips(chipFlows.welcome);
      setShowLargeChips(false);
      closeQuoteForm();
      return;
    }

    setSuggestedChips(null);
    setShowLargeChips(false);
    setLoading(true);

    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      text: chipText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLastQuestion(chipText);

    const typingStartTime = Date.now();

    try {
      const ragResponse = await queryRAGBackend(chipText);
      const elapsed = Date.now() - typingStartTime;
      const remainingWait = Math.max(0, 800 - elapsed);
      if (remainingWait > 0) {
        await wait(remainingWait);
      }

      setMessages((prev) => [
        ...prev,
        buildBotMessage(ragResponse, new Date()),
      ]);

      const followUpChips = getFollowUpChips(chipText);
      if (followUpChips) {
        setSuggestedChips(followUpChips);
        setShowLargeChips(Boolean(followUpChips.isLarge));
      }

      setError('');
    } catch (err) {
      console.error('[CHATBOT] Error:', err);

      setMessages((prev) => [
        ...prev,
        {
          id: messages.length + 2,
          type: 'bot',
          text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
          timestamp: new Date(),
        },
      ]);
      setSuggestedChips(chipFlows.error);
      setShowLargeChips(false);
      setError(err.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) {
      e.preventDefault();
    }

    const userMessage = input.trim();

    if (!userMessage || loading) {
      return;
    }

    setInput('');
    setSuggestedChips(null);
    setLoading(true);

    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      text: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLastQuestion(userMessage);

    const typingStartTime = Date.now();

    try {
      const ragResponse = await queryRAGBackend(userMessage);
      const elapsed = Date.now() - typingStartTime;
      const remainingWait = Math.max(0, 800 - elapsed);
      if (remainingWait > 0) {
        await wait(remainingWait);
      }

      setMessages((prev) => [
        ...prev,
        buildBotMessage(ragResponse, new Date()),
      ]);
      setError('');
    } catch (err) {
      console.error('[CHATBOT] Error:', err);

      setMessages((prev) => [
        ...prev,
        {
          id: messages.length + 2,
          type: 'bot',
          text: 'Sorry, I couldn\'t retrieve the answer right now. Please try again or contact support.',
          timestamp: new Date(),
        },
      ]);
      setSuggestedChips(chipFlows.error);
      setError(err.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 1,
        type: 'bot',
        text: 'Hello! 👋 I\'m your Insurance Assistant. Ask me anything about policies, claims, coverage, benefits, and more. How can I help you today?',
        timestamp: new Date(),
      },
    ]);
    setInput('');
    setError('');
    setSuggestedChips(null);
    setShowQuoteForm(false);
    setQuoteFormType(null);
    setLatestQuote(null);
    setActiveProduct(null);
    setMotorSelections({ vehicleType: '', insuranceType: '' });
    setLifeSelections({ planType: '', sumAssured: '', policyTerm: '' });
    setLifeCustomAmount('');
    setShowLifeCustomAmountInput(false);
  };

  const isFirstMessage = messages.length === 1 && messages[0].type === 'bot';

  return (
    <div className="chatbot-page">
      <div className="chatbot-card">
        <div className="chatbot-header">
          <div className="header-left">
            <div className="bot-avatar">🤖</div>
            <div className="header-info">
              <h2 className="header-title">PolicyHub</h2>
              <div className="status-badge">● Online</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleClearChat} title="Clear chat">
            🔒 Logout
          </button>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, index) => (
            <div key={msg.id}>
              <div className={`message-wrapper message-${msg.type}`}>
                {msg.type === 'bot' && <div className="message-avatar">🤖</div>}
                {msg.cardType === 'premium-breakdown' ? (
                  <div className={`message ${msg.type} premium-card-message`}>
                    <PremiumBreakdownCard quote={msg.quote} />
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ) : (
                  <div className={`message ${msg.type}`}>
                    <p>{msg.text}</p>
                    {(msg.sources?.length || msg.llmComparison?.enabled) ? (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.14)', fontSize: '12px', lineHeight: 1.5, opacity: 0.92 }}>
                        {msg.sources?.length ? (
                          <div style={{ marginBottom: msg.llmComparison?.enabled ? '8px' : 0 }}>
                            <strong>Sources:</strong>{' '}
                            {msg.sources.join(', ')}
                          </div>
                        ) : null}
                        {msg.llmComparison?.enabled ? (
                          <div>
                            <strong>LLM comparison:</strong>{' '}
                            {msg.llmComparison.status === 'ok'
                              ? `overlap score ${Number(msg.llmComparison.overlap_score ?? 0).toFixed(2)}${msg.llmComparison.model ? ` using ${msg.llmComparison.model}` : ''}`
                              : msg.llmComparison.status === 'ollama_unavailable'
                                ? 'not available on this machine'
                                : 'comparison failed'}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {msg.type === 'bot' && showQuoteForm && index === messages.length - 1 && quoteFormType === 'health' && (
                <div style={{ paddingLeft: '42px', marginTop: '12px' }}>
                  <QuoteForm onSubmit={handleQuoteFormSubmit} loading={formLoading} />
                </div>
              )}

              {msg.type === 'bot' && showQuoteForm && index === messages.length - 1 && quoteFormType === 'motor' && (
                <div style={{ paddingLeft: '42px', marginTop: '12px' }}>
                  <MotorQuoteForm
                    onSubmit={handleMotorQuoteFormSubmit}
                    loading={formLoading}
                    vehicleType={motorSelections.vehicleType}
                    insuranceType={motorSelections.insuranceType}
                  />
                </div>
              )}

              {msg.type === 'bot' && showQuoteForm && index === messages.length - 1 && quoteFormType === 'life' && (
                <div style={{ paddingLeft: '42px', marginTop: '12px' }}>
                  <LifeQuoteForm
                    onSubmit={handleLifeQuoteFormSubmit}
                    loading={formLoading}
                    selectedPlanType={lifeSelections.planType}
                    selectedAmount={lifeSelections.sumAssured}
                    selectedTerm={lifeSelections.policyTerm}
                  />
                </div>
              )}

              {msg.type === 'bot' && isFirstMessage && index === 0 && !suggestedChips && (
                <div className="chips-container">
                  {chipFlows.welcome.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      className="action-chip"
                      onClick={() => handleChipClick(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {msg.type === 'bot' && suggestedChips && index === messages.length - 1 && (
                <div>
                  {showLargeChips && suggestedChips.isLarge ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${suggestedChips.columns || 2}, minmax(0, 1fr))`,
                        gap: '12px',
                        padding: '12px 0 0 42px',
                        maxWidth: suggestedChips.columns === 3 ? '620px' : '420px',
                      }}
                    >
                      {suggestedChips.chips.map((chip, idx) => (
                        <BigChip
                          key={idx}
                          icon={chip.icon}
                          label={chip.label}
                          description={chip.description}
                          onClick={() => handleChipClick(chip.label.replace(/\n/g, ' '))}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="chips-container">
                      {suggestedChips.chips.map((chip, idx) => (
                        <button
                          key={idx}
                          className="action-chip"
                          onClick={() => handleChipClick(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {msg.type === 'bot' && activeProduct === 'life' && showLifeCustomAmountInput && suggestedChips === chipFlows.lifeCoverageAmounts && index === messages.length - 1 && (
                <div style={{ paddingLeft: '42px', marginTop: '12px', maxWidth: '420px' }}>
                  <div style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '10px' }}>
                      Custom Sum Assured
                    </div>
                    <input
                      type="text"
                      value={lifeCustomAmount}
                      onChange={(e) => setLifeCustomAmount(e.target.value)}
                      placeholder="Enter amount like 2500000"
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        padding: '0 12px',
                        fontSize: '14px',
                        marginBottom: '10px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={submitLifeCustomAmount}
                      style={{
                        width: '100%',
                        height: '42px',
                        border: 'none',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Use Amount
                    </button>
                  </div>
                </div>
              )}
              {msg.type === 'bot' && showUploadUI && index === messages.length - 1 && latestQuote && (
                <div>
                  <DocumentUpload
                    quote={latestQuote}
                    onSuccess={async (data) => {
                      setShowUploadUI(false);
                      await appendBotMessages(
                        [
                          { text: '✅ Documents uploaded successfully! Our advisor will contact you within 24 hours to complete the purchase.' },
                        ],
                        chipFlows.welcome,
                      );
                    }}
                    onCancel={() => setShowUploadUI(false)}
                  />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message-wrapper message-bot">
              <div className="message-avatar">🤖</div>
              <div className="message bot loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <span>⚠️</span> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chatbot-input-form">
          <button type="button" className="btn-attach" title="Attach file">
            📎
          </button>
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="chatbot-input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="chatbot-send-btn"
          >
            {loading ? '...' : '➤'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;
