import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment } from '../models/appointment.model';
import { AppointmentService } from '../services/services2/appointments.service';
import { Router } from '@angular/router';
import { IbgeService } from '../ibge.service';
import { AuthService } from '../services/auth.service';
import { RoomService } from '../services/services2/room.service';
import { BedService } from '../services/services2//bed.service';

interface Cidade {
  id: number;
  nome: string;
}

interface Estado {
  id: number;
  nome: string;
  sigla: string;
}

interface RoomAvailability {
  [key: string]: {
    available: number;
    occupied: number;
  };
}

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments-list.component.html',
  styleUrls: ['./appointments-list.component.css'],
})
export class AppointmentsListComponent implements OnInit {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  searchTerm: string = '';
  sortBy: string = 'name-asc';
  availableBeds: number = 0;
  totalBeds: number = 12;
  selectedAppointment: Appointment | null = null;
  isHideModalOpen: boolean = false;
  isLoading: boolean = false;
  states: Estado[] = [];
  cidades: Cidade[] = [];
  roomAvailability: any = {};
  

  roomNames: { [key: number]: string } = {
    1: 'Quarto A',
    2: 'Quarto B',
    3: 'Quarto C',
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private appointmentsService: AppointmentService,
    private ibgeService: IbgeService,
    private authService: AuthService,
    private roomService: RoomService,
    private bedService: BedService,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    this.isLoading = true;
    try {
      await Promise.all([
        this.loadAppointments(),
        this.loadStates()
      ]);
    } finally {
      this.isLoading = false;
    }
  }

 private async loadAppointments(): Promise<void> {
  try {
    const data = await this.appointmentsService.getAppointments().toPromise();
    this.processAppointments(data || []);
    await this.calculateAvailableBeds();
    this.changeDetectorRef.detectChanges(); 
  } catch (err) {
    console.error('Erro ao carregar agendamentos:', err);
  }
}

  private processAppointments(data: Appointment[]): void {
    this.appointments = data.map(appointment => {
      this.processPhotoUrl(appointment);
      appointment.accommodation_mode = appointment.accommodation_mode || 'pernoite';

      if (!appointment.additionalInfo) {
        appointment.additionalInfo = this.initializeAdditionalInfo();
      }

      appointment.additionalInfo.roomDisplayName = 
        appointment.additionalInfo.room_id 
          ? this.roomNames[appointment.additionalInfo.room_id] || 'Desconhecido' 
          : 'Não alocado';

      appointment.additionalInfo.bedDisplayName = 
        appointment.additionalInfo.bed_id 
          ? `Cama ${appointment.additionalInfo.bed_id}` 
          : 'Não alocado';

      return appointment;
    });

    this.filteredAppointments = this.appointments.filter(a => !a.isHidden);
  }

  private processPhotoUrl(appointment: Appointment): void {
    if (!appointment.photo) {
      appointment.photo_url = undefined;
      return;
    }

    if (appointment.photo instanceof File) {
      appointment.photo_url = URL.createObjectURL(appointment.photo);
      return;
    }

    if (typeof appointment.photo === 'string') {
      if (appointment.photo.startsWith('http')) {
        appointment.photo_url = appointment.photo;
        return;
      }
      
      if (appointment.photo.includes('photos/')) {
        const filename = appointment.photo.split('photos/')[1];
        appointment.photo_url = `http://localhost:8000/storage/photos/${filename}`;
        return;
      }
    }

    console.error('Formato de foto não suportado:', appointment.photo);
    appointment.photo_url = undefined;
  }

  async calculateAvailableBeds(): Promise<void> {
  try {
    if (!this.appointments || this.appointments.length === 0) {
      await this.loadAppointments();
    }

    const rooms = await this.roomService.getRooms().toPromise();
    const allBeds = await this.bedService.getBedsByRoomId(1).toPromise().catch(() => []);

    this.roomAvailability = {};
    rooms?.forEach(room => {
      this.roomAvailability[room.name.split(' ')[1]] = { 
        available: 4,
        occupied: 0
      };
    });

    const occupiedAppointments = this.appointments
      .filter(a => !a.isHidden && a.additionalInfo?.bed_id != null);
    
    // Atualiza contagem de ocupação
    occupiedAppointments.forEach(app => {
      const roomId = app.additionalInfo?.room_id;
      const room = rooms?.find(r => r.id === roomId);
      if (room) {
        const roomLetter = room.name.split(' ')[1];
        this.roomAvailability[roomLetter].occupied++;
        this.roomAvailability[roomLetter].available = 
          4 - this.roomAvailability[roomLetter].occupied;
      }
    });

    // Calcula total de vagas disponíveis
    this.totalBeds = 12;
    
    // Solução para os erros de tipagem
    const roomsAvailability = Object.values(this.roomAvailability) as Array<{available: number, occupied: number}>;
    this.availableBeds = roomsAvailability.reduce(
      (sum: number, room: {available: number, occupied: number}) => sum + room.available, 
      0
    );

    console.log('Vagas calculadas:', {
      total: this.totalBeds,
      disponíveis: this.availableBeds,
      ocupadas: this.totalBeds - this.availableBeds,
      quartos: this.roomAvailability
    });

    this.changeDetectorRef.detectChanges();
  } catch (err) {
    console.error('Erro ao calcular vagas:', err);
    this.availableBeds = 0;
    this.totalBeds = 12;
    this.roomAvailability = {
      A: { available: 0, occupied: 0 },
      B: { available: 0, occupied: 0 },
      C: { available: 0, occupied: 0 }
    };
    this.changeDetectorRef.detectChanges();
  }
}

  private initializeAdditionalInfo() {
    return {
      ethnicity: '',
      addictions: '',
      is_accompanied: false,
      benefits: '',
      is_lactating: false,
      has_disability: false,
      reason_for_accommodation: '',
      has_religion: false,
      religion: '',
      has_chronic_disease: false,
      chronic_disease: '',
      education_level: '',
      nationality: '',
      room_id: null,
      bed_id: null,
      stay_duration: null,
    };
  }

  private async loadStates(): Promise<void> {
    try {
      const states = await this.http.get<Estado[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados').toPromise();
      this.states = states || [];
      this.loadCities();
    } catch (err) {
      console.error('Erro ao carregar estados:', err);
    }
  }

  private loadCities(): void {
    this.cidades = [];
    this.states.forEach(state => {
      this.ibgeService.getCidadesPorEstado(state.id).subscribe({
        next: (cidades) => {
          this.cidades = [...this.cidades, ...cidades];
        },
        error: (err) => console.error(`Erro ao carregar cidades do estado ${state.id}:`, err)
      });
    });
  }

  getStateName(stateId: string | number): string {
    const id = Number(stateId);
    const estado = this.states.find(e => e.id === id);
    return estado ? estado.nome : 'Desconhecido';
  }

  getCityName(cityId: string | number): string {
    const id = Number(cityId);
    const cidade = this.cidades.find(c => c.id === id);
    return cidade ? cidade.nome : 'Desconhecido';
  }

  getAccommodationLabel(mode: string): string {
    const labels: { [key: string]: string } = {
      '24_horas': '24 Horas',
      'pernoite': 'Pernoite',
    };
    return labels[mode] || 'Desconhecido';
  }

  getGenderLabel(gender: string): string {
    const genderMap: { [key: string]: string } = {
      male: 'Masculino',
      female: 'Feminino',
      other: 'Outro'
    };
    return genderMap[gender] || 'Não informado';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredAppointments = this.appointments.filter(a => !a.isHidden);
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      this.filteredAppointments = this.appointments.filter(appointment =>
        appointment.name.toLowerCase().includes(searchTermLower) ||
        appointment.last_name.toLowerCase().includes(searchTermLower)
      );
    }
  }

  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy = target.value;
    this.sortFilteredAppointments();
  }

  private sortFilteredAppointments(): void {
    const [key, order] = this.sortBy.split('-') as [keyof Appointment, string];
    
    this.filteredAppointments.sort((a, b) => {
      const aValue = key === 'date' ? new Date(a.date).getTime() : String(a[key]).toLowerCase();
      const bValue = key === 'date' ? new Date(b.date).getTime() : String(b[key]).toLowerCase();

      return order === 'asc' 
        ? aValue > bValue ? 1 : -1 
        : aValue < bValue ? 1 : -1;
    });
  }

  toggleShowMore(appointment: Appointment): void {
    appointment.showMore = !appointment.showMore;
  }

  editAppointment(appointment: Appointment): void {
    if (!appointment.id) {
      console.error('Cannot edit appointment without ID');
      return;
    }
    this.router.navigate(['/edit-list', appointment.id]);
  }

  openHideModal(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.isHideModalOpen = true;
  }

  closeHideModal(): void {
    this.isHideModalOpen = false;
    this.selectedAppointment = null;
  }

 async confirmHide(): Promise<void> {
  if (!this.selectedAppointment?.id) return;

  try {
    await this.appointmentsService.updateVisibility(this.selectedAppointment.id, true).toPromise();
    this.selectedAppointment.isHidden = true;
    this.filteredAppointments = this.appointments.filter(a => !a.isHidden);
    
    await this.calculateAvailableBeds();
    this.changeDetectorRef.detectChanges();
    
    this.closeHideModal();
  } catch (err) {
    console.error('Erro ao ocultar acolhimento:', err);
  }
}

  toCamelCase(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatCpf(cpf?: string): string {
    if (!cpf || cpf.length !== 11) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  formatPhoneNumber(phone?: string): string {
    if (!phone) return 'Não informado';
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    
    return phone;
  }

  formatTime(time: string | null): string {
    if (!time) return 'Não informado';
    const [hoursStr, minutesStr] = time.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (isNaN(hours) || isNaN(minutes)) return time;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  formatLabel(value: string): string {
    if (!value) return 'Não informado';
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  ngOnDestroy() {
    this.appointments.forEach(appointment => {
      if (appointment.photo instanceof File && appointment.photo_url) {
        URL.revokeObjectURL(appointment.photo_url);
      }
    });
  }
}