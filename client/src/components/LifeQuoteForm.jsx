import React, { useState } from 'react';
import '../styles/QuoteForm.css';

const riderOptions = [
  { label: 'Critical Illness (+₹5000)', value: 'Critical Illness' },
  { label: 'Accidental Death (+₹3000)', value: 'Accidental Death' },
  { label: 'Waiver of Premium (+₹2000)', value: 'Waiver of Premium' },
  { label: 'Income Protection (+₹4000)', value: 'Income Protection' },
  { label: 'Child Benefit (+₹2500)', value: 'Child Benefit' },
];

const conditionOptions = ['Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Cancer', 'Others'];

const calculateAge = (dobValue) => {
  const dob = new Date(dobValue);
  if (Number.isNaN(dob.getTime())) return NaN;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

const LifeQuoteForm = ({ onSubmit, loading, selectedPlanType = '', selectedAmount = '', selectedTerm = '' }) => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    mobile: '',
    email: '',
    city: '',
    occupation: 'Salaried',
    annualIncome: '0-5L',
    isSmoker: '',
    hasHealthConditions: '',
    healthConditions: [],
    familyHistory: '',
    familyHistoryDetails: '',
    nomineeName: '',
    nomineeRelation: 'Spouse',
    nomineeAge: '',
    selectedRiders: [],
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    const age = calculateAge(formData.dob);

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    } else if (Number.isNaN(age) || age < 18 || age > 80) {
      newErrors.dob = 'Age must be between 18 and 80 years';
    }
    if (!formData.gender) newErrors.gender = 'Select gender';
    if (!/^\d{10}$/.test(formData.mobile)) newErrors.mobile = 'Enter valid 10-digit mobile';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.occupation) newErrors.occupation = 'Occupation is required';
    if (!formData.annualIncome) newErrors.annualIncome = 'Annual income is required';
    if (!formData.isSmoker) newErrors.isSmoker = 'Select smoker status';
    if (!formData.hasHealthConditions) newErrors.hasHealthConditions = 'Please select an option';
    if (!formData.nomineeName.trim()) newErrors.nomineeName = 'Nominee name is required';
    if (!formData.nomineeRelation) newErrors.nomineeRelation = 'Nominee relation is required';
    if (!formData.nomineeAge || Number(formData.nomineeAge) < 0 || Number(formData.nomineeAge) > 120) {
      newErrors.nomineeAge = 'Enter valid nominee age';
    }

    if (formData.hasHealthConditions === 'Yes' && formData.healthConditions.length === 0) {
      newErrors.healthConditions = 'Select at least one medical condition';
    }

    if (formData.familyHistory === 'Yes' && !formData.familyHistoryDetails.trim()) {
      newErrors.familyHistoryDetails = 'Please specify relation and condition';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter valid email';
    }

    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const toggleArrayValue = (field, value) => {
    setFormData((prev) => {
      const currentValues = prev[field] || [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [field]: nextValues,
      };
    });
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const age = calculateAge(formData.dob);
    await onSubmit({
      ...formData,
      age,
      planType: selectedPlanType,
      sumAssured: String(selectedAmount || ''),
      policyTerm: String(selectedTerm || ''),
    });
  };

  const coverageAmountText = selectedAmount ? `₹${Number(selectedAmount).toLocaleString('en-IN')}` : 'Not selected';

  return (
    <div className="quote-form-card" style={{ maxWidth: '560px' }}>
      <div className="form-header">
        <span>🛡️ Life Insurance Details</span>
      </div>

      <div className="form-group" style={{ background: 'rgba(79,70,229,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Coverage Summary</div>
        <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
          <div><strong>Plan Type:</strong> {selectedPlanType || 'Not selected'}</div>
          <div><strong>Sum Assured:</strong> {coverageAmountText}</div>
          <div><strong>Policy Term:</strong> {selectedTerm ? `${selectedTerm} Years` : 'Not selected'}</div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="name">Full Name *</label>
        <input id="name" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter your full name" className={errors.name ? 'input-error' : ''} />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="dob">Date of Birth *</label>
          <input id="dob" type="date" name="dob" value={formData.dob} onChange={handleInputChange} className={errors.dob ? 'input-error' : ''} />
          {errors.dob && <span className="error-text">{errors.dob}</span>}
        </div>

        <div className="form-group" style={{ flex: 1, marginLeft: '12px' }}>
          <label>Gender *</label>
          <div className="radio-group">
            {['Male', 'Female', 'Other'].map((option) => (
              <label className="radio-label" key={option}>
                <input type="radio" name="gender" value={option} checked={formData.gender === option} onChange={handleInputChange} />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {errors.gender && <span className="error-text">{errors.gender}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="mobile">Mobile Number *</label>
        <input id="mobile" type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="Enter 10-digit mobile number" maxLength="10" className={errors.mobile ? 'input-error' : ''} />
        {errors.mobile && <span className="error-text">{errors.mobile}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email (optional)" className={errors.email ? 'input-error' : ''} />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="city">City *</label>
        <input id="city" type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="Enter your city" className={errors.city ? 'input-error' : ''} />
        {errors.city && <span className="error-text">{errors.city}</span>}
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="occupation">Occupation *</label>
          <select id="occupation" name="occupation" value={formData.occupation} onChange={handleInputChange} className={errors.occupation ? 'input-error' : ''}>
            <option value="Salaried">Salaried</option>
            <option value="Business">Business</option>
            <option value="Professional">Professional</option>
            <option value="Housewife">Housewife</option>
            <option value="Student">Student</option>
            <option value="Retired">Retired</option>
            <option value="Other">Other</option>
          </select>
          {errors.occupation && <span className="error-text">{errors.occupation}</span>}
        </div>

        <div className="form-group" style={{ flex: 1, marginLeft: '12px' }}>
          <label htmlFor="annualIncome">Annual Income *</label>
          <select id="annualIncome" name="annualIncome" value={formData.annualIncome} onChange={handleInputChange} className={errors.annualIncome ? 'input-error' : ''}>
            <option value="0-5L">0-5L</option>
            <option value="5-10L">5-10L</option>
            <option value="10-25L">10-25L</option>
            <option value="25L+">25L+</option>
          </select>
          {errors.annualIncome && <span className="error-text">{errors.annualIncome}</span>}
        </div>
      </div>

      <div className="form-group">
        <label>Smoker? *</label>
        <div className="radio-group">
          {['Yes', 'No'].map((option) => (
            <label className="radio-label" key={option}>
              <input type="radio" name="isSmoker" value={option} checked={formData.isSmoker === option} onChange={handleInputChange} />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {errors.isSmoker && <span className="error-text">{errors.isSmoker}</span>}
      </div>

      <div className="form-group">
        <label>Any Medical Condition? *</label>
        <div className="radio-group">
          {['Yes', 'No'].map((option) => (
            <label className="radio-label" key={option}>
              <input type="radio" name="hasHealthConditions" value={option} checked={formData.hasHealthConditions === option} onChange={handleInputChange} />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {errors.hasHealthConditions && <span className="error-text">{errors.hasHealthConditions}</span>}
      </div>

      {formData.hasHealthConditions === 'Yes' && (
        <div className="form-group">
          <label>Medical Details *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            {conditionOptions.map((condition) => (
              <label key={condition} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d1d5db', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.healthConditions.includes(condition)}
                  onChange={() => toggleArrayValue('healthConditions', condition)}
                />
                <span>{condition}</span>
              </label>
            ))}
          </div>
          {errors.healthConditions && <span className="error-text">{errors.healthConditions}</span>}
        </div>
      )}

      <div className="form-group">
        <label>Family History of Critical Illness?</label>
        <div className="radio-group">
          {['Yes', 'No'].map((option) => (
            <label className="radio-label" key={option}>
              <input type="radio" name="familyHistory" value={option} checked={formData.familyHistory === option} onChange={handleInputChange} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      {formData.familyHistory === 'Yes' && (
        <div className="form-group">
          <label htmlFor="familyHistoryDetails">Please specify relation and condition *</label>
          <input
            id="familyHistoryDetails"
            type="text"
            name="familyHistoryDetails"
            value={formData.familyHistoryDetails}
            onChange={handleInputChange}
            placeholder="Example: Father - Heart Disease"
            className={errors.familyHistoryDetails ? 'input-error' : ''}
          />
          {errors.familyHistoryDetails && <span className="error-text">{errors.familyHistoryDetails}</span>}
        </div>
      )}

      <div className="form-group">
        <label>Additional Riders</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          {riderOptions.map((rider) => (
            <label
              key={rider.value}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={formData.selectedRiders.includes(rider.value)}
                onChange={() => toggleArrayValue('selectedRiders', rider.value)}
              />
              <span>{rider.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="nomineeName">Nominee Name *</label>
        <input id="nomineeName" type="text" name="nomineeName" value={formData.nomineeName} onChange={handleInputChange} placeholder="Enter nominee name" className={errors.nomineeName ? 'input-error' : ''} />
        {errors.nomineeName && <span className="error-text">{errors.nomineeName}</span>}
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="nomineeRelation">Relationship *</label>
          <select id="nomineeRelation" name="nomineeRelation" value={formData.nomineeRelation} onChange={handleInputChange} className={errors.nomineeRelation ? 'input-error' : ''}>
            <option value="Spouse">Spouse</option>
            <option value="Child">Child</option>
            <option value="Parent">Parent</option>
            <option value="Sibling">Sibling</option>
            <option value="Other">Other</option>
          </select>
          {errors.nomineeRelation && <span className="error-text">{errors.nomineeRelation}</span>}
        </div>

        <div className="form-group" style={{ flex: 1, marginLeft: '12px' }}>
          <label htmlFor="nomineeAge">Age *</label>
          <input id="nomineeAge" type="number" name="nomineeAge" value={formData.nomineeAge} onChange={handleInputChange} placeholder="Enter age" min="0" max="120" className={errors.nomineeAge ? 'input-error' : ''} />
          {errors.nomineeAge && <span className="error-text">{errors.nomineeAge}</span>}
        </div>
      </div>

      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? (
          <>
            <span className="spinner"></span>
            Calculating...
          </>
        ) : (
          'Calculate My Premium →'
        )}
      </button>
    </div>
  );
};

export default LifeQuoteForm;
