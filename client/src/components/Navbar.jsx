import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, logout, getUser } from '../utils/auth';

const Navbar = () => {
  const navigate = useNavigate();
  const auth = isAuthenticated();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🔐</span>
        <Link to={auth ? '/chat' : '/'} className="brand-name">PolicyHub</Link>
      </div>
      <div className="navbar-actions">
        {auth ? (
          <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
        ) : null}
      </div>
    </nav>
  );
};

export default Navbar;
