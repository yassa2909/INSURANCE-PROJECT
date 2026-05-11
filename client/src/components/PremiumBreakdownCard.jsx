import React from 'react';
import '../styles/PremiumBreakdownCard.css';

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

const PremiumBreakdownCard = ({ quote }) => {
  if (!quote) return null;

  const { formData, premium, quoteId, validUntil, planType, quoteType = 'health' } = quote;

  if (quoteType === 'life') {
    const riders = formData.selectedRiders && formData.selectedRiders.length ? formData.selectedRiders : ['None selected'];
    const medicalConditions = formData.hasHealthConditions === 'Yes'
      ? (Array.isArray(formData.healthConditions) && formData.healthConditions.length ? formData.healthConditions.join(', ') : 'Yes')
      : 'None';

    return (
      <div className="premium-card life" role="region" aria-label="Life Insurance Quote">
        <div className="premium-header life-header">
          <div className="premium-title">Life Insurance Quote</div>
          <div className="premium-quote-id">Quote ID: {quoteId}</div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Customer Details</div>
          <div className="premium-table">
            <div className="premium-row"><span>Name</span><strong>{formData.name}</strong></div>
            <div className="premium-row"><span>Age</span><strong>{formData.age} years</strong></div>
            <div className="premium-row"><span>Gender</span><strong>{formData.gender}</strong></div>
            <div className="premium-row"><span>Mobile</span><strong>{formData.mobile}</strong></div>
            <div className="premium-row"><span>City</span><strong>{formData.city}</strong></div>
            <div className="premium-row"><span>Occupation</span><strong>{formData.occupation}</strong></div>
          </div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Plan Details</div>
          <div className="premium-table">
            <div className="premium-row"><span>Plan Type</span><strong>{planType}</strong></div>
            <div className="premium-row"><span>Sum Assured</span><strong>{formatCurrency(premium.sumAssured)}</strong></div>
            <div className="premium-row"><span>Policy Term</span><strong>{premium.durationInYears} Years</strong></div>
            <div className="premium-row"><span>Nominee</span><strong>{formData.nomineeName}</strong></div>
            <div className="premium-row"><span>Relationship</span><strong>{formData.nomineeRelation}</strong></div>
            <div className="premium-row"><span>Nominee Age</span><strong>{formData.nomineeAge}</strong></div>
          </div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Health Status</div>
          <div className="premium-table">
            <div className="premium-row"><span>Smoker</span><strong>{formData.isSmoker}</strong></div>
            <div className="premium-row"><span>Medical Conditions</span><strong>{medicalConditions}</strong></div>
            <div className="premium-row"><span>Family History</span><strong>{formData.familyHistory || 'No'}</strong></div>
          </div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Premium Breakdown</div>
          <div className="premium-table">
            <div className="premium-row"><span>Base Premium</span><strong>{formatCurrency(premium.basePremium)}</strong></div>
            <div className="premium-row"><span>Rider Charges</span><strong>{formatCurrency(premium.riderPremium)}</strong></div>
            <div className="premium-row"><span>GST (18%)</span><strong>{formatCurrency(premium.gst)}</strong></div>
            <div className="premium-total-row"><span>Total Premium</span><strong>{formatCurrency(premium.total)} /year</strong></div>
            <div className="premium-row"><span>Monthly EMI</span><strong>{formatCurrency(premium.emi)} /month</strong></div>
            {premium.maturityBenefit ? (
              <div className="premium-row"><span>Maturity Benefit</span><strong>{formatCurrency(premium.maturityBenefit)}</strong></div>
            ) : null}
          </div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Selected Riders</div>
          <div className="motor-addon-list">
            {riders.map((rider) => (
              <div key={rider}>{rider}</div>
            ))}
          </div>
        </div>

        <div className="premium-benefits">
          <div>Death Benefit equal to Sum Assured</div>
          <div>Flexible premium payment options</div>
          <div>24/7 claim support</div>
          <div>Free policy review</div>
        </div>

        <div className="premium-footer">
          <div>Valid Until: {validUntil}</div>
          <div className="premium-quote-id">Quote ID: {quoteId}</div>
        </div>
      </div>
    );
  }

  if (quoteType === 'motor') {
    const addonLabels = formData.addons && formData.addons.length > 0 ? formData.addons : ['None selected'];

    return (
      <div className="premium-card motor" role="region" aria-label="Motor Insurance Quote">
        <div className="premium-header motor-header">
          <div className="premium-title">Motor Insurance Quote</div>
          <div className="premium-quote-id">Quote ID: {quoteId}</div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Owner Details</div>
          <div className="premium-table">
            <div className="premium-row"><span>Name</span><strong>{formData.name}</strong></div>
            <div className="premium-row"><span>Mobile</span><strong>{formData.mobile}</strong></div>
            <div className="premium-row"><span>City</span><strong>{formData.city}</strong></div>
          </div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Vehicle Details</div>
          <div className="premium-table">
            <div className="premium-row"><span>Vehicle</span><strong>{`${formData.brand} ${formData.model}`.trim()}</strong></div>
            <div className="premium-row"><span>Fuel Type</span><strong>{formData.fuelType}</strong></div>
            <div className="premium-row"><span>Year</span><strong>{formData.year}</strong></div>
            <div className="premium-row"><span>Reg. No.</span><strong>{formData.regNo}</strong></div>
            <div className="premium-row"><span>IDV</span><strong>{formatCurrency(premium.idv)}</strong></div>
            <div className="premium-row"><span>Policy Type</span><strong>{formData.insuranceType}</strong></div>
          </div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Premium Breakdown</div>
          <div className="premium-table">
            <div className="premium-row"><span>Own Damage Premium</span><strong>{formatCurrency(premium.odPremium)}</strong></div>
            <div className="premium-row"><span>Third Party Premium</span><strong>{formatCurrency(premium.tpPremium)}</strong></div>
            <div className="premium-row"><span>NCB Discount (-)</span><strong>{formatCurrency(premium.ncbAmount)}</strong></div>
            <div className="premium-row"><span>Add-on Charges</span><strong>{formatCurrency(premium.addonTotal)}</strong></div>
            <div className="premium-row"><span>GST (18%)</span><strong>{formatCurrency(premium.gst)}</strong></div>
            <div className="premium-total-row"><span>Total Premium</span><strong>{formatCurrency(premium.total)} /year</strong></div>
            <div className="premium-row"><span>Monthly EMI</span><strong>{formatCurrency(premium.emi)} /month</strong></div>
          </div>
        </div>

        <div className="premium-section">
          <div className="premium-section-title">Selected Add-ons</div>
          <div className="motor-addon-list">
            {addonLabels.map((addon) => (
              <div key={addon}>{addon}</div>
            ))}
          </div>
        </div>

        <div className="premium-benefits motor-benefits">
          <div>Own Damage Cover</div>
          <div>Third Party Liability</div>
          <div>Cashless Repairs at 5000+ Garages</div>
          <div>24/7 Roadside Assistance</div>
        </div>

        <div className="premium-footer">
          <div>Valid Until: {validUntil}</div>
          <div className="premium-quote-id">Quote ID: {quoteId}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card" role="region" aria-label="Health Insurance Quote">
      <div className="premium-header">
        <div className="premium-title">Health Insurance Quote</div>
        <div className="premium-quote-id">Quote ID: {quoteId}</div>
      </div>

      <div className="premium-section">
        <div className="premium-section-title">Customer Details</div>
        <div className="premium-table">
          <div className="premium-row"><span>Name</span><strong>{formData.name}</strong></div>
          <div className="premium-row"><span>Age</span><strong>{formData.age} years</strong></div>
          <div className="premium-row"><span>Gender</span><strong>{formData.gender}</strong></div>
          <div className="premium-row"><span>Mobile</span><strong>{formData.mobile}</strong></div>
          <div className="premium-row"><span>City</span><strong>{formData.city}</strong></div>
          <div className="premium-row"><span>Members</span><strong>{formData.members}</strong></div>
          <div className="premium-row"><span>Pre-existing</span><strong>{formData.preExisting}</strong></div>
        </div>
      </div>

      <div className="premium-section">
        <div className="premium-section-title">Plan Details</div>
        <div className="premium-table">
          <div className="premium-row"><span>Sum Insured</span><strong>{formData.sumInsured}</strong></div>
          <div className="premium-row"><span>Plan Type</span><strong>{planType}</strong></div>
          <div className="premium-row"><span>Policy Term</span><strong>1 Year</strong></div>
          <div className="premium-row"><span>Coverage</span><strong>Comprehensive</strong></div>
        </div>
      </div>

      <div className="premium-section">
        <div className="premium-section-title">Premium Breakdown</div>
        <div className="premium-table">
          <div className="premium-row"><span>Base Premium</span><strong>{formatCurrency(premium.basePremium)}</strong></div>
          <div className="premium-row"><span>GST (18%)</span><strong>{formatCurrency(premium.gst)}</strong></div>
          <div className="premium-row"><span>Loading (if any)</span><strong>{formatCurrency(premium.loading)}</strong></div>
          <div className="premium-total-row"><span>Total Premium</span><strong>{formatCurrency(premium.total)} /year</strong></div>
          <div className="premium-row"><span>Monthly EMI</span><strong>{formatCurrency(premium.emi)} /month</strong></div>
        </div>
      </div>

      <div className="premium-benefits">
        <div>Cashless at 10,000+ hospitals</div>
        <div>No claim bonus up to 50%</div>
        <div>Free annual health checkup</div>
        <div>24/7 claim support</div>
      </div>

      <div className="premium-footer">
        <div>Valid Until: {validUntil}</div>
        <div className="premium-quote-id">Quote ID: {quoteId}</div>
      </div>
    </div>
  );
};

export default PremiumBreakdownCard;
