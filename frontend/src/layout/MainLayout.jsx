import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header/Header';
import SideNav from './SideNav/SideNav';

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <SideNav />
      <main className="flex-1 flex flex-col relative bg-bg-page min-w-0">
        <Header />
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
