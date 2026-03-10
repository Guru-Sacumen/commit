import React, { useState } from 'react';
import { User, Lock, Save } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    fullName: 'Alex Johnson',
    email: 'alex.johnson@securetech.com',
    company: 'SecureTech Inc.',
    role: 'VP of Engineering',
    phone: '+1 (555) 123-4567',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    // No backend - placeholder only
  };

  return (
    <main className="profile-main profile-light">
      <div className="profile-content">
        <div className="profile-header">
          <h1 className="profile-title">Profile Settings</h1>
          <p className="profile-desc">Manage your account and security.</p>
        </div>

        <div className="profile-tabs">
          <button
            type="button"
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="profile-tab-icon" />
            Profile
          </button>
          <button
            type="button"
            className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <Lock className="profile-tab-icon" />
            Password
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="profile-card">
            <h2 className="profile-card-title">Personal Information</h2>
            <form onSubmit={handleSave} className="profile-form">
              <div className="profile-form-grid">
                <div className="profile-field">
                  <label className="profile-label">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    className="profile-input"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="profile-input"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="profile-form-grid">
                <div className="profile-field">
                  <label className="profile-label">Company</label>
                  <input
                    type="text"
                    name="company"
                    className="profile-input"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-label">Role</label>
                  <input
                    type="text"
                    name="role"
                    className="profile-input"
                    value={formData.role}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="profile-field">
                <label className="profile-label">Phone</label>
                <input
                  type="text"
                  name="phone"
                  className="profile-input profile-input-phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" className="profile-save-btn">
                <Save className="profile-save-icon" />
                Save Changes
              </button>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="profile-card">
            <h2 className="profile-card-title">Change Password</h2>
            <form className="profile-form">
              <div className="profile-field">
                <label className="profile-label">Current Password</label>
                <input type="password" className="profile-input" placeholder="Enter current password" />
              </div>
              <div className="profile-field">
                <label className="profile-label">New Password</label>
                <input type="password" className="profile-input" placeholder="Enter new password" />
              </div>
              <div className="profile-field">
                <label className="profile-label">Confirm New Password</label>
                <input type="password" className="profile-input" placeholder="Confirm new password" />
              </div>
              <button type="button" className="profile-save-btn">
                <Lock className="profile-save-icon" />
                Update Password
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
};

export default Profile;
