import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Music, Users, CalendarDays, DollarSign } from 'lucide-react';
import Students from './components/students';
import Calendar from './components/calendar';
import Payments from './components/payments';
import './App.css';

function AppContent() {
  const location = useLocation();

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <Music size={32} />
              <h1>My Music Students</h1>
            </div>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <div className="container">
          <div className="nav-tabs">
            <Link
              to="/students"
              className={`nav-tab ${location.pathname === '/students' ? 'active' : ''}`}
            >
              <Users size={20} />
              <span>Students</span>
            </Link>
            <Link
              to="/calendar"
              className={`nav-tab ${location.pathname === '/calendar' ? 'active' : ''}`}
            >
              <CalendarDays size={20} />
              <span>Calendar</span>
            </Link>
            <Link
              to="/payments"
              className={`nav-tab ${location.pathname === '/payments' ? 'active' : ''}`}
            >
              <DollarSign size={20} />
              <span>Payments</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="app-main">
        <div className="container">
          <Routes>
            <Route path="/students" element={<Students />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/" element={<Calendar />} />
          </Routes>
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>Piano Studio Manager &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
