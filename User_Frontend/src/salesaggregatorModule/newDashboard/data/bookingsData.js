// src/data/bookingsData.js
export const bookings = [
  { id: 'HB-1042', customer: 'Ramesh Patil', service: 'Spraying', date: '24 Sep', amount: '₹6,200', status: 'Completed', pilot: 'Rahul Nair' },
  { id: 'HB-1041', customer: 'Sunita Rao', service: 'Mapping', date: '23 Sep', amount: '₹4,800', status: 'Active', pilot: 'Vikram Rao' },
  { id: 'HB-1039', customer: 'Deepak Verma', service: 'Videography', date: '22 Sep', amount: '₹9,500', status: 'Upcoming', pilot: 'Divya Menon' },
  { id: 'HB-1035', customer: 'Anita Joshi', service: 'Surveillance', date: '20 Sep', amount: '₹5,100', status: 'Completed', pilot: 'Rahul Nair' },
  { id: 'HB-1033', customer: 'Karan Mehta', service: 'Spraying', date: '19 Sep', amount: '₹6,800', status: 'Cancelled', pilot: 'Rahul Nair' },
  { id: 'HB-1030', customer: 'Priya Nambiar', service: 'Mapping', date: '17 Sep', amount: '₹4,300', status: 'Completed', pilot: 'Vikram Rao' },
];

export const recentBookings = bookings.slice(0, 4);

export default { bookings, recentBookings };
