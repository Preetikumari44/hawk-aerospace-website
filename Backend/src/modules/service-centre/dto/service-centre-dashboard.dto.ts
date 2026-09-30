import { ApiProperty } from '@nestjs/swagger';

export class ServiceCentreDashboardDto {
  @ApiProperty({ description: 'Total number of service centre agents/technicians' })
  totalAgents: number;

  @ApiProperty({ description: 'Total open tickets' })
  totalOpenTickets: number;

  @ApiProperty({ description: 'Total pending tickets (open + assigned)' })
  totalPendingTickets: number;

  @ApiProperty({ description: 'Total completed tickets' })
  totalCompletedTickets: number;

  @ApiProperty({ description: 'SLA breach count' })
  slaBreachCount: number;

  @ApiProperty({ description: 'Ticket escalations count' })
  ticketEscalations: number;

  @ApiProperty({ description: 'Tickets count over time data', type: 'object' })
  ticketsOverTime: {
    labels: string[];
    open: number[];
    inProgress: number[];
    closed: number[];
  };

  @ApiProperty({ description: 'Tickets by status breakdown' })
  ticketsByStatus: {
    open: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    closed: number;
    cancelled: number;
  };

  @ApiProperty({ description: 'Tickets by priority breakdown' })
  ticketsByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  @ApiProperty({ description: 'Average resolution time in hours' })
  avgResolutionTime: number;
}
