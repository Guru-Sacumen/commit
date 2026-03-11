import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TicketCard from './TicketCard';

/**
 * DraggableTicketCard - Wrapper for TicketCard with drag-and-drop support.
 * 
 * Uses dnd-kit's useSortable hook for drag functionality.
 * Only Super Admin users can drag tickets.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.ticket - Ticket data
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.isDragDisabled - Whether dragging is disabled
 * @returns {JSX.Element} Draggable ticket card
 */
const DraggableTicketCard = ({ ticket, onClick, isDragDisabled = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    disabled: isDragDisabled,
    data: {
      type: 'ticket',
      ticket,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragDisabled ? 'default' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDragDisabled ? {} : listeners)}
    >
      <TicketCard
        ticket={ticket}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
};

export default DraggableTicketCard;
