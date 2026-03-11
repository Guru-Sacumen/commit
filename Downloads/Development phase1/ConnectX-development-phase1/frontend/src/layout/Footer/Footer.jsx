import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-bg-card border-t border-border-light py-6 px-10">
      <div className="flex justify-between items-center">
        <div className="text-sm text-text-muted">
          © 2026 ConnectX Enterprise Console. All rights reserved.
        </div>
        <div className="flex gap-6 text-sm">
          <a href="#" className="text-text-muted hover:text-text-main transition-colors">Documentation</a>
          <a href="#" className="text-text-muted hover:text-text-main transition-colors">Support</a>
          <a href="#" className="text-text-muted hover:text-text-main transition-colors">API</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
