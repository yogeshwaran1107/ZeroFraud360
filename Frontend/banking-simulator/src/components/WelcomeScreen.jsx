import React from 'react';
import './WelcomeScreen.css';

export default function WelcomeScreen({ onNavigate }) {
  return (
    <div className="mobile-wrapper welcome-wrapper">
      <div className="welcome-screen">


        {/* Header Branding */}
        <div className="branding-section">
          <div className="bank-logo-icon">
            <svg viewBox="0 0 100 80" className="pillar-svg">
              <polygon points="50,10 10,35 90,35" fill="currentColor" />
              <rect x="15" y="37" width="70" height="5" fill="currentColor" />
              <rect x="22" y="45" width="12" height="25" rx="2" fill="currentColor" />
              <rect x="44" y="45" width="12" height="25" rx="2" fill="currentColor" />
              <rect x="66" y="45" width="12" height="25" rx="2" fill="currentColor" />
              <rect x="15" y="73" width="70" height="6" fill="currentColor" />
            </svg>
          </div>
          <h1 className="app-title">IndianBankSim</h1>
          <p className="app-subtitle">Experience India's Digital Payments Ecosystem</p>
        </div>

        {/* Center India Map + Rupee Watermark Illustration */}
        <div className="map-illustration-container">
          <div className="india-map-watermark">
            <svg viewBox="0 0 300 300" className="india-svg">
              <path 
                d="M150 40 Q160 50 180 55 T210 70 T240 95 T260 120 T240 140 T220 150 T200 160 T180 180 T170 210 T160 250 T150 270 T140 250 T130 210 T120 180 T100 160 T80 150 T60 140 T40 120 T60 95 T90 70 T120 55 T140 50 Z" 
                fill="rgba(255, 255, 255, 0.08)"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <div className="rupee-orbit">
            <span className="rupee-symbol">₹</span>
            <svg className="orbit-arrows-svg" viewBox="0 0 160 160">
              <path 
                d="M 30 80 A 50 50 0 0 1 130 80" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.4)" 
                strokeWidth="2" 
                strokeDasharray="4 4"
              />
              <path 
                d="M 130 80 A 50 50 0 0 1 30 80" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.4)" 
                strokeWidth="2" 
              />
              <polygon points="128,72 138,80 126,86" fill="rgba(255, 255, 255, 0.7)" />
            </svg>
          </div>
        </div>

        {/* Features Checklist */}
        <div className="features-list">
          <div className="feature-item">
            <div className="feature-icon-badge">
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
            <span>Send &amp; Receive Money</span>
          </div>

          <div className="feature-item">
            <div className="feature-icon-badge">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <span>Secure &amp; Real-time</span>
          </div>

          <div className="feature-item">
            <div className="feature-icon-badge">
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <span>Simulated Indian Banking Network</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn-welcome-login" onClick={() => onNavigate && onNavigate('dashboard')}>
            Login
          </button>
          <button className="btn-welcome-register" onClick={() => onNavigate && onNavigate('dashboard')}>
            Create Account
          </button>
        </div>

        {/* Footer Note */}
        <div className="welcome-footer">
          A learning project simulating Indian payment systems (UPI, IMPS, NEFT, RTGS)
        </div>
      </div>
    </div>
  );
}
