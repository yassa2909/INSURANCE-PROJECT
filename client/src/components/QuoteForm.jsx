import React, { useState } from 'react';
import '../styles/QuoteForm.css';

const QuoteForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    mobile: '',
    email: '',
    city: '',
    sumInsured: '₹5 Lakhs',
    members: '1',
    preExisting: ''
  });
  
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.age || formData.age < 1 || formData.age > 99) {
      newErrors.age = 'Enter valid age (1-99)';
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Select gender';
    }
    
    if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Enter valid 10-digit mobile';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.preExisting) {
      newErrors.preExisting = 'Please select an option';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter valid email';
    }
    
    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleMembersClick = (count) => {
    setFormData(prev => ({
      ...prev,
      members: count
    }));
  };

  const handlePreExistingChange = (value) => {
    setFormData(prev => ({
      ...prev,
      preExisting: value
    }));
    if (errors.preExisting) {
      setErrors(prev => ({
        ...prev,
        preExisting: ''
      }));
    }
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Call parent callback with form data
    await onSubmit(formData);
  };

  return (
    <div className="quote-form-card">
      <div className="form-header">
        <span>👤 Basic Details</span>
      </div>

      <div className="form-group">
        <label htmlFor="name">Full Name *</label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter your full name"
          className={errors.name ? 'input-error' : ''}
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="age">Age *</label>
          <input
            id="age"
            type="number"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            placeholder="Enter age"
            min="1"
            max="99"
            className={errors.age ? 'input-error' : ''}
          />
          {errors.age && <span className="error-text">{errors.age}</span>}
        </div>

        <div className="form-group" style={{ flex: 1, marginLeft: '12px' }}>
          <label htmlFor="gender">Gender *</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            className={errors.gender ? 'input-error' : ''}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <span className="error-text">{errors.gender}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="mobile">Mobile Number *</label>
        <input
          id="mobile"
          type="tel"
          name="mobile"
          value={formData.mobile}
          onChange={handleInputChange}
          placeholder="Enter 10-digit mobile number"
          maxLength="10"
          className={errors.mobile ? 'input-error' : ''}
        />
        {errors.mobile && <span className="error-text">{errors.mobile}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter email (optional)"
          className={errors.email ? 'input-error' : ''}
        />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="city">City *</label>
        <input
          id="city"
          type="text"
          name="city"
          value={formData.city}
          onChange={handleInputChange}
          placeholder="Enter your city"
          className={errors.city ? 'input-error' : ''}
        />
        {errors.city && <span className="error-text">{errors.city}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="sumInsured">Sum Insured *</label>
        <select
          id="sumInsured"
          name="sumInsured"
          value={formData.sumInsured}
          onChange={handleInputChange}
        >
          <option value="₹3 Lakhs">₹3 Lakhs</option>
          <option value="₹5 Lakhs">₹5 Lakhs</option>
          <option value="₹10 Lakhs">₹10 Lakhs</option>
          <option value="₹15 Lakhs">₹15 Lakhs</option>
          <option value="₹25 Lakhs">₹25 Lakhs</option>
          <option value="₹50 Lakhs">₹50 Lakhs</option>
        </select>
      </div>

      <div className="form-group">
        <label>Number of Members *</label>
        <div className="members-toggle">
          {['1', '2', '3', '4+'].map(count => (
            <button
              key={count}
              className={`toggle-btn ${formData.members === count ? 'active' : ''}`}
              onClick={() => handleMembersClick(count)}
              type="button"
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Pre-existing Conditions? *</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="preExisting"
              value="No"
              checked={formData.preExisting === 'No'}
              onChange={() => handlePreExistingChange('No')}
            />
            <span>No</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="preExisting"
              value="Yes"
              checked={formData.preExisting === 'Yes'}
              onChange={() => handlePreExistingChange('Yes')}
            />
            <span>Yes</span>
          </label>
        </div>
        {errors.preExisting && <span className="error-text">{errors.preExisting}</span>}
      </div>

      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={loading}
        type="button"
      >
        {loading ? (
          <>
            <span className="spinner"></span> Generating Quote...
          </>
        ) : (
          <>Get My Quote →</>
        )}
      </button>
    </div>
  );
};

export default QuoteForm;
