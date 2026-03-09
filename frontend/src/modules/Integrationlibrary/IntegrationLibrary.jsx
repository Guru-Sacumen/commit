import { Outlet } from 'react-router-dom';

const IntegrationLayout = () => {
  return (
    <div>
      <h2>Integration Module</h2>
      <Outlet />
    </div>
  );
};

export default IntegrationLayout;