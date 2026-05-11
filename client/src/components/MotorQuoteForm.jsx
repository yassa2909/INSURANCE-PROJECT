import React, { useState } from 'react';
import '../styles/MotorQuoteForm.css';

const brandModels = {
  Maruti: ['Swift', 'Dzire', 'Brezza', 'Baleno'],
  Hyundai: ['i20', 'Creta', 'Venue', 'Verna'],
  Tata: ['Punch', 'Nexon', 'Altroz', 'Harrier'],
  Honda: ['City', 'Amaze', 'Elevate', 'WR-V'],
  Toyota: ['Glanza', 'Urban Cruiser', 'Innova', 'Fortuner'],
  Kia: ['Seltos', 'Sonet', 'Carens', 'Syros'],
  MG: ['Comet', 'Astor', 'Hector', 'ZS EV'],
  Mahindra: ['XUV 3XO', 'Thar', 'Scorpio-N', 'XUV700'],
  Others: ['Custom Model'],
};

const addonOptions = [
  { label: 'Zero Depreciation', cost: 2500 },
  { label: 'Engine Guard', cost: 1500 },
  { label: 'Roadside Assistance', cost: 800 },
  { label: 'Key Protect', cost: 600 },
  { label: 'Return to Invoice', cost: 2000 },
  { label: 'Tyre Cover', cost: 1200 },
];

const yearOptions = Array.from({ length: new Date().getFullYear() - 2004 }, (_, index) => String(new Date().getFullYear() - index));

const MotorQuoteForm = ({ onSubmit, loading, vehicleType, insuranceType }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
    brand: 'Maruti',
    model: '',
    fuelType: 'Petrol',
    year: String(new Date().getFullYear()),
    regNo: '',
    idv: '',
    policyStatus: 'New Vehicle',
    ncb: '0%',
    addons: [],
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!/^[0-9]{10}$/.test(formData.mobile)) newErrors.mobile = 'Enter valid 10-digit mobile';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter valid email';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.brand) newErrors.brand = 'Brand is required';
    if (!formData.model.trim()) newErrors.model = 'Model is required';
    if (!formData.year) newErrors.year = 'Year is required';
    if (!formData.regNo.trim()) {
      newErrors.regNo = 'Registration number is required';
    } else if (!/^[A-Z]{2}\s?\d{2}\s?[A-Z]{2}\s?\d{4}$/i.test(formData.regNo.trim())) {
      newErrors.regNo = 'Use format like TS 09 AB 1234';
    }

    const idvValue = Number(formData.idv);
    if (!formData.idv || Number.isNaN(idvValue)) {
      newErrors.idv = 'Vehicle value is required';
    } else if (idvValue < 50000) {
      newErrors.idv = 'IDV must be at least ₹50,000';
    }

    if (!vehicleType) newErrors.vehicleType = 'Select a vehicle type first';
    if (!insuranceType) newErrors.insuranceType = 'Select an insurance type first';

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

  const handleFuelChange = (fuelType) => {
    setFormData((prev) => ({
      ...prev,
      fuelType,
    }));
  };

  const handlePolicyStatusChange = (policyStatus) => {
    setFormData((prev) => ({
      ...prev,
      policyStatus,
    }));
  };

  const handleNcbChange = (ncb) => {
    setFormData((prev) => ({
      ...prev,
      ncb,
    }));
  };

  const handleAddonToggle = (addonLabel) => {
    setFormData((prev) => {
      const addons = prev.addons.includes(addonLabel)
        ? prev.addons.filter((item) => item !== addonLabel)
        : [...prev.addons, addonLabel];

      return {
        ...prev,
        addons,
      };
    });
  };

  const handleSubmit = async () => {
    const newErrors = validate();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      ...formData,
      vehicleType,
      insuranceType,
    });
  };

  return (
    <div className="motor-quote-form-card">
      <div className="motor-form-header">
        <span>🚗 Vehicle Details</span>
      </div>

      <div className="motor-context-banner">
        <div><strong>Vehicle Type:</strong> {vehicleType || 'Not selected'}</div>
        <div><strong>Insurance Type:</strong> {insuranceType || 'Not selected'}</div>
      </div>

      <div className="motor-form-section-title">Owner Details</div>
      <div className="motor-form-group">
        <label htmlFor="name">Full Name *</label>
        <input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter full name"
          className={errors.name ? 'input-error' : ''}
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="motor-grid-two">
        <div className="motor-form-group">
          <label htmlFor="mobile">Mobile Number *</label>
          <input
            id="mobile"
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleInputChange}
            placeholder="10-digit mobile"
            maxLength="10"
            className={errors.mobile ? 'input-error' : ''}
          />
          {errors.mobile && <span className="error-text">{errors.mobile}</span>}
        </div>

        <div className="motor-form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Optional"
            className={errors.email ? 'input-error' : ''}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>
      </div>

      <div className="motor-form-group">
        <label htmlFor="city">City *</label>
        <input
          id="city"
          name="city"
          value={formData.city}
          onChange={handleInputChange}
          placeholder="Enter city"
          className={errors.city ? 'input-error' : ''}
        />
        {errors.city && <span className="error-text">{errors.city}</span>}
      </div>

      <div className="motor-form-section-title">Vehicle Details</div>
      <div className="motor-grid-two">
        <div className="motor-form-group">
          <label htmlFor="brand">Vehicle Brand *</label>
          <select
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={handleInputChange}
            className={errors.brand ? 'input-error' : ''}
          >
            {Object.keys(brandModels).map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          {errors.brand && <span className="error-text">{errors.brand}</span>}
        </div>

        <div className="motor-form-group">
          <label htmlFor="model">Model *</label>
          <input
            id="model"
            name="model"
            value={formData.model}
            onChange={handleInputChange}
            placeholder={brandModels[formData.brand]?.[0] || 'Enter model name'}
            className={errors.model ? 'input-error' : ''}
          />
          {errors.model && <span className="error-text">{errors.model}</span>}
        </div>
      </div>

      <div className="motor-form-group">
        <label>Fuel Type *</label>
        <div className="motor-toggle-row">
          {['Petrol', 'Diesel', 'CNG', 'Electric'].map((fuelType) => (
            <button
              type="button"
              key={fuelType}
              className={`motor-toggle-btn ${formData.fuelType === fuelType ? 'active' : ''}`}
              onClick={() => handleFuelChange(fuelType)}
            >
              {fuelType}
            </button>
          ))}
        </div>
      </div>

      <div className="motor-grid-two">
        <div className="motor-form-group">
          <label htmlFor="year">Year of Manufacture *</label>
          <select
            id="year"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            className={errors.year ? 'input-error' : ''}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {errors.year && <span className="error-text">{errors.year}</span>}
        </div>

        <div className="motor-form-group">
          <label htmlFor="regNo">Registration Number *</label>
          <input
            id="regNo"
            name="regNo"
            value={formData.regNo}
            onChange={handleInputChange}
            placeholder="TS 09 AB 1234"
            className={errors.regNo ? 'input-error' : ''}
          />
          {errors.regNo && <span className="error-text">{errors.regNo}</span>}
        </div>
      </div>

      <div className="motor-form-group">
        <label htmlFor="idv">Vehicle Value (IDV) *</label>
        <input
          id="idv"
          type="number"
          name="idv"
          value={formData.idv}
          onChange={handleInputChange}
          placeholder="Enter amount"
          min="50000"
          className={errors.idv ? 'input-error' : ''}
        />
        {errors.idv && <span className="error-text">{errors.idv}</span>}
      </div>

      <div className="motor-form-group">
        <label>Previous Policy Status *</label>
        <div className="motor-radio-grid">
          {['New Vehicle', 'Active', 'Expired', 'Expired > 90 days'].map((policyStatus) => (
            <label key={policyStatus} className="motor-radio-pill">
              <input
                type="radio"
                name="policyStatus"
                checked={formData.policyStatus === policyStatus}
                onChange={() => handlePolicyStatusChange(policyStatus)}
              />
              <span>{policyStatus}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="motor-form-group">
        <label>No Claim Bonus (NCB) % *</label>
        <div className="motor-toggle-row motor-wrap-row">
          {['0%', '20%', '25%', '35%', '45%', '50%'].map((ncb) => (
            <button
              type="button"
              key={ncb}
              className={`motor-toggle-btn ${formData.ncb === ncb ? 'active' : ''}`}
              onClick={() => handleNcbChange(ncb)}
            >
              {ncb}
            </button>
          ))}
        </div>
      </div>

      <div className="motor-form-group">
        <label>Add-ons (optional)</label>
        <div className="motor-addon-grid">
          {addonOptions.map((addon) => (
            <label key={addon.label} className="motor-addon-item">
              <input
                type="checkbox"
                checked={formData.addons.includes(addon.label)}
                onChange={() => handleAddonToggle(addon.label)}
              />
              <span>{addon.label}</span>
              <small>+₹{addon.cost.toLocaleString('en-IN')}</small>
            </label>
          ))}
        </div>
      </div>

      <button className="motor-submit-btn" onClick={handleSubmit} disabled={loading} type="button">
        {loading ? (
          <>
            <span className="spinner"></span> Calculating Premium...
          </>
        ) : (
          <>Calculate My Premium →</>
        )}
      </button>
    </div>
  );
};

export default MotorQuoteForm;
