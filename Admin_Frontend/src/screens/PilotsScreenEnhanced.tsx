import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { pilotApi, Pilot, PilotRequest, PilotBooking, PilotSupportTicket, PilotStats } from '../api/pilot.api';
import { showAlert, showConfirm } from '../utils/dialog';

// ==================== TYPE DEFINITIONS ====================
type ViewMode = 'LIST' | 'DETAILS' | 'INCOMING_REQUEST';
type ActiveTab = 'current' | 'incoming';
type DetailTab = 'missions' | 'tickets' | 'maintenance';

interface PilotsScreenProps {
  navigation?: any;
}

// ==================== MAIN COMPONENT ====================
export default function PilotsScreenEnhanced({ navigation }: PilotsScreenProps) {
  // --- Core State Management ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('current');
  const [currentView, setCurrentView] = useState<ViewMode>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [detailTab, setDetailTab] = useState<DetailTab>('missions');
  
  // --- Data State ---
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [pilotRequests, setPilotRequests] = useState<PilotRequest[]>([]);
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PilotRequest | null>(null);
  const [pilotBookings, setPilotBookings] = useState<PilotBooking[]>([]);
  const [pilotTickets, setPilotTickets] = useState<PilotSupportTicket[]>([]);
  const [pilotStats, setPilotStats] = useState<PilotStats | null>(null);
  
  // --- Loading & Error State ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching Effects ---
  useEffect(() => {
    if (activeTab === 'current') {
      fetchPilots();
    } else {
      fetchPilotRequests();
    }
  }, [activeTab, selectedState]);

  // ==================== API CALLS ====================
  const fetchPilots = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (selectedState) filters.state = selectedState;
      
      const response = await pilotApi.getAll(filters);
      setPilots(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pilots');
      console.error('Error fetching pilots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPilotRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await pilotApi.getAllRequests('PENDING');
      setPilotRequests(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pilot requests');
      console.error('Error fetching pilot requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPilotDetails = async (pilotId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch pilot details
      const pilotResponse = await pilotApi.getById(pilotId);
      setSelectedPilot(pilotResponse.data);

      // Fetch related data in parallel
      const [bookingsRes, ticketsRes, statsRes] = await Promise.all([
        pilotApi.getBookings(pilotId),
        pilotApi.getSupportTickets(pilotId),
        pilotApi.getStats(pilotId),
      ]);

      setPilotBookings(bookingsRes.data);
      setPilotTickets(ticketsRes.data);
      setPilotStats(statsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pilot details');
      console.error('Error fetching pilot details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (requestId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await pilotApi.getRequestById(requestId);
      setSelectedRequest(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch request details');
      console.error('Error fetching request details:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== ACTION HANDLERS ====================
  const handlePilotClick = async (pilot: Pilot) => {
    await fetchPilotDetails(pilot.pilotId);
    setCurrentView('DETAILS');
  };

  const handleRequestClick = async (request: PilotRequest) => {
    await fetchRequestDetails(request.requestId);
    setCurrentView('INCOMING_REQUEST');
  };

  const handleBackToList = () => {
    setCurrentView('LIST');
    setSelectedPilot(null);
    setSelectedRequest(null);
    setPilotBookings([]);
    setPilotTickets([]);
    setPilotStats(null);
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!(await showConfirm('Are you sure you want to approve this pilot application?'))) {
      return;
    }

    try {
      setLoading(true);
      const response = await pilotApi.approveRequest(requestId, {
        approvedBy: 'ADMIN001', // Should come from auth context
      });
      
      showAlert('Success: Pilot request approved successfully');
      
      // Switch to current pilots tab and refresh the list
      setActiveTab('current');
      handleBackToList();
      
      // Refresh both lists to show updated data
      await fetchPilots();
      await fetchPilotRequests();
    } catch (err: any) {
      showAlert(`Error: ${err.message || 'Failed to approve request'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    
    if (!reason || reason.trim() === '') {
      if (reason !== null) { // User clicked OK but didn't enter anything
        showAlert('Error: Rejection reason is required');
      }
      return;
    }
    
    try {
      setLoading(true);
      await pilotApi.rejectRequest(requestId, {
        rejectedBy: 'ADMIN001', // Should come from auth context
        rejectionReason: reason,
      });
      
      showAlert('Success: Pilot request rejected');
      handleBackToList();
      fetchPilotRequests();
    } catch (err: any) {
      showAlert(`Error: ${err.message || 'Failed to reject request'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Text style={{ padding: 20, fontSize: 24, fontWeight: 'bold' }}>
        Pilots Screen Enhanced - Under Development
      </Text>
    </View>
  );
}
