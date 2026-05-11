const pool = require('../config/db');

/**
 * Simple Recommendation Engine Logic
 */
const generateRecommendation = (type, data) => {
  let coverage = 'Standard';
  let premium = '₹5,000 - ₹15,000';
  let plan = 'Basic Plan';

  switch (type) {
    case 'Motor':
      coverage = data.coverageType === 'Comprehensive' ? 'Full Value Protection' : 'Third-Party Liability';
      premium = data.vehicleType === 'Car' ? '₹12,000 - ₹25,000' : '₹2,000 - ₹8,000';
      plan = data.addons?.includes('Zero Dep') ? 'Premium Plus Plan' : 'Standard Comprehensive';
      break;
    case 'Health':
      coverage = `₹${data.sumInsured || '10L'} Base Cover`;
      premium = data.age > 45 ? '₹18,000 - ₹35,000' : '₹8,000 - ₹15,000';
      plan = data.coverageType === 'Family Floater' ? 'Family Gold Plan' : 'Individual Platinum';
      break;
    case 'Life':
      coverage = `₹${data.coverageAmountRequired || '1 Crore'} Sum Assured`;
      premium = data.smoking === 'Yes' ? '₹25,000 - ₹45,000' : '₹12,000 - ₹20,000';
      plan = data.purpose === 'Protection' ? 'Pure Term Insurance' : 'Endowment/Investment Plan';
      break;
    case 'Travel':
      coverage = `${data.medicalCoverageAmount || '50k'} USD Medical Cover`;
      premium = data.destinationCountry?.toLowerCase().includes('usa') ? '₹3,000 - ₹7,000' : '₹1,500 - ₹3,500';
      plan = data.travelType === 'Multi-trip' ? 'Annual Multi-Trip' : 'Single Trip Secure';
      break;
  }

  return {
    policyType: type,
    recommendedCoverage: coverage,
    estimatedPremium: premium,
    suggestedPlan: plan,
    summary: `Based on your ${type} insurance inputs, we recommend the ${plan} with ${coverage}.`
  };
};

const submitPolicy = async (req, res) => {
  const { type, formData } = req.body;
  const userId = req.user?.id; // From authMiddleware

  try {
    const recommendation = generateRecommendation(type, formData);

    const result = await pool.query(
      `INSERT INTO policies (user_id, type, form_data, recommendation)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, type, JSON.stringify(formData), JSON.stringify(recommendation)]
    );

    res.status(201).json({
      success: true,
      message: 'Policy application submitted!',
      data: result.rows[0].form_data,
      recommendation: result.rows[0].recommendation
    });
  } catch (err) {
    console.error('Policy submission error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit policy.' });
  }
};

module.exports = { submitPolicy };
