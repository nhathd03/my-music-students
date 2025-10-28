import { useState } from 'react';
import { Music, Users, CalendarDays, DollarSign } from 'lucide-react';
import Students from './components/students';
import Calendar from './components/calendar';
import Payments from './components/payments';
import './App.css';

type Tab = 'students' | 'calendar' | 'payments';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <Music size={32} />
              <h1>Piano Studio Manager</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        <div className="container">
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <Users size={20} />
              <span>Students</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <CalendarDays size={20} />
              <span>Calendar</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              <DollarSign size={20} />
              <span>Payments</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        <div className="container">
          {activeTab === 'students' && <Students />}
          {activeTab === 'calendar' && <Calendar />}
          {activeTab === 'payments' && <Payments />}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container">
          <p>Piano Studio Manager &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
