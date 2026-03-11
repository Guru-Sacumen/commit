import React from 'react';
import { SupportPortal, TicketList, TicketCreate, TicketDetail } from './pages';

/**
 * Support Module Routes Configuration.
 * 
 * Routes:
 * - /support - Support Portal with Board/List view toggle
 * - /support/tickets - Ticket List view (legacy)
 * - /support/tickets/new - Create new ticket
 * - /support/tickets/:ticketId - Ticket detail view
 */
const SupportRoutes = [
  {
    path: 'support',
    element: <SupportPortal />,
  },
  {
    path: 'support/tickets',
    element: <TicketList />,
  },
  {
    path: 'support/tickets/new',
    element: <TicketCreate />,
  },
  {
    path: 'support/tickets/:ticketId',
    element: <TicketDetail />,
  },
];

export default SupportRoutes;
