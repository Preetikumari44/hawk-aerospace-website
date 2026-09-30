// Ticket / repair-request data. Kept separate from technician profile
// and dashboard stats so a future ticketing API only touches this file.

export const activeTicket = null; // no active ticket at the moment
export const nextTicket = null; // no upcoming ticket assigned

export const incomingTickets = [];
export const incomingTicketsCount = incomingTickets.length;
export const incomingRequestsCount = 4; // "Incoming Requests (04)" on Repairs

export const ticketsByDay = {}; // keyed by 'YYYY-MM-DD', empty until API data exists

export function getTicketsForDate(dateKey) {
  return ticketsByDay[dateKey] || [];
}

export default {
  activeTicket,
  nextTicket,
  incomingTickets,
  incomingTicketsCount,
  incomingRequestsCount,
  ticketsByDay,
  getTicketsForDate,
};
