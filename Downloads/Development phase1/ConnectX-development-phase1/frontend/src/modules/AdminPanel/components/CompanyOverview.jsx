import React from 'react';
import { Card, CardContent, Typography, Grid, Avatar, Box, Chip } from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  ElectricalServices as ElectricalServicesIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const CompanyOverview = ({ companies, oauthUsers, connectorCatalog, onToggleCompanyForm, setActiveTab, isSuper }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Company Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Total Companies Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            border: 'none', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                  <BusinessIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <TrendingUpIcon sx={{ fontSize: 20, opacity: 0.8 }} />
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
                {companies?.length || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Companies
              </Typography>
            </CardContent>
          </Card>
        </Grid>

  
        {/* Active Connectors Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            border: 'none', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                  <ElectricalServicesIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <TrendingUpIcon sx={{ fontSize: 20, opacity: 0.8 }} />
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
                {connectorCatalog?.length || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Available Connectors
              </Typography>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Quick Actions Section - MOVED FROM COMPANIESHOME */}
      <Card sx={{ mt: 3, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label="Create Company" 
              variant="outlined" 
              clickable 
              onClick={onToggleCompanyForm}
              sx={{ px: 2, py: 1 }}
            />
            <Chip 
              label={`View ${companies?.length || 0} Companies`} 
              variant="outlined" 
              clickable 
              onClick={() => setActiveTab && setActiveTab("companies")}
              sx={{ px: 2, py: 1 }}
            />
            {isSuper && (
              <Chip 
                label={`Manage ${oauthUsers?.length || 0} External Users`} 
                variant="outlined" 
                sx={{ px: 2, py: 1 }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CompanyOverview;
