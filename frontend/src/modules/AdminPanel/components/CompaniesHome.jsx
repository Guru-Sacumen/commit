import React from 'react';
import CompanyForm from './CompanyForm';
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CompanyOverview from './CompanyOverview';

const CompaniesHome = ({ 
  isSuper, 
  oauthUsers, 
  showCompanyForm, 
  companySearch, 
  filteredCompanies, 
  companies, 
  onBackToLanding, 
  onToggleCompanyForm, 
  onCompanySearch,
  onOpenCompany,
  setCompanies,
  token,
  connectorCatalog,
  onCompanyCreated
}) => {
  return (
    <section className="companies-home">
      {/* Only show Create Company button for superadmin */}
      {isSuper && (
        <div className="companies-home-actions" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={onToggleCompanyForm}
          >
            {showCompanyForm ? 'Close' : 'Create Company'}
          </button>
        </div>
      )}

      {isSuper && oauthUsers.length > 0 && (
        <div className="oauth-users-panel">
          <h2>External Users</h2>
          <ul>
            {oauthUsers.map((u) => (
              <li key={u.id}>{u.email} ({u.auth_provider})</li>
            ))}
          </ul>
        </div>
      )}

      {/* Only show Companies content - no tabs */}
      <div className="detail-panel">
          <div className="companies-toolbar">
            <label>
              Search Company
              <input
                type="search"
                placeholder="Search by company name or tenant id"
                value={companySearch}
                onChange={(e) => onCompanySearch(e.target.value)}
              />
            </label>
            <div className="companies-count-pill">
              Showing {filteredCompanies.length} / {companies.length}
            </div>
          </div>

          {companies.length === 0 ? (
            <div className="empty-state">No companies exist. Create a company to get started.</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="empty-state">No company matches the current search.</div>
          ) : (
            <div className="company-cards-grid">
              {filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className="company-card"
                  onClick={() => onOpenCompany(company.id)}
                >
                  <div className="company-card-title">{company.name}</div>
                  <div className="company-card-meta">{company.id}</div>
                </button>
              ))}
            </div>
          )}
        </div>

      {/* Only show Company Creation Dialog for superadmin */}
      {isSuper && (
        <Dialog 
          open={showCompanyForm} 
          onClose={onToggleCompanyForm}
          maxWidth="90%"
          fullWidth
        >
          <DialogTitle>
            Create New Company
            <IconButton
              aria-label="close"
              onClick={onToggleCompanyForm}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <CompanyForm
              setCompanies={setCompanies}
              token={token}
              connectorCatalog={connectorCatalog}
              onSuccess={(tenantId) => {
                onToggleCompanyForm();
                onCompanyCreated(tenantId);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
};

export default CompaniesHome;
