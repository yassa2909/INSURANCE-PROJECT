import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import OTPForm from '../components/OTPForm';
import { clearPreLoginCredentials } from '../utils/auth';

const Register = () => {
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    clearPreLoginCredentials();
  }, []);

  const handleRegisterSuccess = (data) => {
    setUserData(data);
    setStep('verify');
  };

  const handleVerifySuccess = () => {
    navigate('/chat');
  };

  const handleBack = () => {
    setStep('register');
  };

  return (
    <div className="page-centered">
      <div className="step-indicator">
        <div className={`step-dot ${step === 'register' ? 'active' : 'done'}`}>
          {step === 'verify' ? '✓' : '1'}
        </div>
        <div className={`step-line ${step === 'verify' ? 'active' : ''}`} />
        <div className={`step-dot ${step === 'verify' ? 'active' : ''}`}>2</div>
      </div>

      {step === 'register' ? (
        <RegisterForm onSuccess={handleRegisterSuccess} />
      ) : (
        <OTPForm
          userData={userData}
          onSuccess={handleVerifySuccess}
          onBack={handleBack}
        />
      )}

      <p className="page-footnote">
        Already have an account?{' '}
        <a href="/login" className="link-accent">Login</a>
      </p>
    </div>
  );
};

export default Register;
