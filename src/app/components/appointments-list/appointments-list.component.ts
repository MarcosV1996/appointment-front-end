import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment } from '../models/appointment.model';
import { AppointmentService } from '../services/services2/appointments.service';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

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
  rooms: any[] = [];
  availableBeds: number = 0;
  totalBeds: number = 12;
  roomNames: { [key: number]: string } = {
    1: 'Quarto A',
    2: 'Quarto B',
    3: 'Quarto C',
  };
  selectedAppointment: Appointment | null = null;
  isHideModalOpen: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private appointmentsService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
  }
  
  loadRooms(): void {
    this.rooms = [
      { id: 1, name: 'Quarto A', beds: [{ id: 1, isOccupied: false }, { id: 2, isOccupied: false }] },
      { id: 2, name: 'Quarto B', beds: [{ id: 3, isOccupied: false }, { id: 4, isOccupied: true }] },
      { id: 3, name: 'Quarto C', beds: [{ id: 5, isOccupied: false }, { id: 6, isOccupied: false }] },
    ];
  }
  
  loadAppointments(): void {
    this.appointmentsService.getAppointments().subscribe({
      next: (data: Appointment[]) => {
        this.appointments = data.map((appointment) => {
          if (appointment.photo && typeof appointment.photo === 'string') {
            if (!appointment.photo.startsWith('http')) {
              appointment.photo_url = `http://127.0.0.1:8000/storage/${appointment.photo}`;
            } else {
              appointment.photo_url = appointment.photo; // Caso já esteja completa
            }
            console.log(`Foto carregada: ${appointment.photo_url}`);
          }
  
          // Garante que additionalInfo sempre exista
          if (!appointment.additionalInfo) {
            appointment.additionalInfo = {
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
  
          // Adiciona os nomes do quarto e da cama com validação de null
          appointment.additionalInfo.roomDisplayName = appointment.additionalInfo.room_id !== null
            ? this.roomNames[appointment.additionalInfo.room_id]
            : 'Não alocado';
  
          appointment.additionalInfo.bedDisplayName = appointment.additionalInfo.bed_id
            ? `Cama ${appointment.additionalInfo.bed_id}`
            : 'Não alocado';
  
          return appointment;
        });
  
        // Filtra os agendamentos visíveis
        this.filteredAppointments = this.appointments.filter((a) => !a.isHidden);
  
        this.calculateAvailableBeds();
      },
      error: (err) => console.error('Erro ao carregar agendamentos:', err),
    });
  }
  
  getGenderLabel(gender: string): string {
    const genderMap: { [key: string]: string } = {
      male: 'Masculino',
      female: 'Feminino',
      other: 'Outro'
    };
    return genderMap[gender] || 'Não informado';
  }
  
  // Atualizar busca e filtro
  onSearch(): void {
    if (!this.searchTerm.trim()) {
      // Se a busca estiver vazia, exibe apenas os que NÃO estão ocultos
      this.filteredAppointments = this.appointments.filter(a => !a.isHidden);
    } else {
      // Se há pesquisa, exibe os que combinam com o nome (incluindo ocultos)
      this.filteredAppointments = this.appointments.filter(appointment =>
        appointment.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        appointment.last_name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  formatLabel(value: string): string {
    if (!value) return 'Não informado';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
  
  getEducationLabel(level: string): string {
    const educationMap: { [key: string]: string } = {
      fundamental: 'Ensino Fundamental',
      medio: 'Ensino Médio',
      tecnico: 'Curso Técnico',
      superior: 'Ensino Superior',
      pos_graduacao: 'Pós-Graduação',
      mestrado: 'Mestrado',
      doutorado: 'Doutorado'
    };
    return educationMap[level] || 'Não informado';
  }

  // Ordenar lista de agendamentos
  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy = target.value;
    this.sortFilteredAppointments();
  }

  sortFilteredAppointments(): void {
    const sortOrder = this.sortBy.split('-');
    const key = sortOrder[0] as keyof Appointment;
    const order = sortOrder[1];

    this.filteredAppointments.sort((a, b) => {
      const aValue = key === 'date' ? new Date(a.date).getTime() : String(a[key]).toLowerCase();
      const bValue = key === 'date' ? new Date(b.date).getTime() : String(b[key]).toLowerCase();

      return order === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });
  }

  toggleShowMore(appointment: Appointment): void {
    appointment.showMore = !appointment.showMore;
  }

  // Abrir modal de ocultação
  openHideModal(appointment: Appointment): void {
    console.log('Abrindo modal para:', appointment);
    this.selectedAppointment = appointment;
    this.isHideModalOpen = true;
  }
  
  // Fechar modal de ocultação
  closeHideModal(): void {
    this.isHideModalOpen = false;
    this.selectedAppointment = null;
  }

  // Confirmar ocultação
  confirmHide(): void {
    if (!this.selectedAppointment) {
      return;
    }
  
    this.appointmentsService.updateVisibility(this.selectedAppointment.id, true).subscribe({
      next: () => {
        console.log('Agendamento ocultado com sucesso.');
        
        // Atualiza localmente (opcional, caso prefira não recarregar a página)
        this.selectedAppointment!.isHidden = true;
        this.filteredAppointments = this.appointments.filter(a => !a.isHidden);
        this.isHideModalOpen = false;

        window.location.reload();
      },
      error: (err) => {
        console.error('Erro ao ocultar acolhimento:', err);
      },
    });
}

  saveEditedAppointment(appointment: Appointment): void {
    if (!appointment.additionalInfo) {
      appointment.additionalInfo = {
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
  
    this.appointmentsService.updateAppointment(appointment.id, appointment).subscribe({
      next: (updatedAppointment) => {
        console.log('Dados retornados do backend:', updatedAppointment);
  
        // Atualiza a lista localmente
        const index = this.appointments.findIndex((a) => a.id === updatedAppointment.id);
        if (index !== -1) {
          this.appointments[index] = updatedAppointment;
        }
  
        this.filterAppointments(); // Atualiza a lista filtrada
      },
      error: (err) => console.error('Erro ao salvar os dados:', err),
    });
  }
  
  updateAvailableBeds(appointment: any, isFreeing: boolean): void {
    const room = this.rooms.find((r: any) => r.id === appointment.additionalInfo.room_id);
    if (room) {
      const bed = room.beds.find((b: any) => b.id === appointment.additionalInfo.bed_id);
      if (bed) {
        bed.isOccupied = !isFreeing;
        this.calculateAvailableBeds(); // Atualiza as vagas disponíveis
      }
    }
  }
  
  filterAppointments(): void {
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      this.filteredAppointments = this.appointments.filter(
        (appointment) =>
          (!appointment.isHidden || this.searchTerm) && 
          (appointment.name.toLowerCase().includes(searchTermLower) ||
            appointment.last_name.toLowerCase().includes(searchTermLower))
      );
    } else {
      this.filteredAppointments = this.appointments.filter((appointment) => !appointment.isHidden);
    }
  }

  editAppointment(appointment: Appointment): void {
    if (!appointment.additionalInfo) {
      appointment.additionalInfo = {
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
  
    this.router.navigate(['/edit', appointment.id]);
  }
  
  calculateAvailableBeds(): void {
    const occupiedBeds = this.appointments
      .filter((appointment) => appointment.additionalInfo?.bed_id != null)
      .map((appointment) => appointment.additionalInfo!.bed_id);
  
    this.availableBeds = this.totalBeds - occupiedBeds.length;
  }
  
  toCamelCase(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatCpf(cpf?: string): string {
    if (!cpf || cpf.length !== 11) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  formatPhoneNumber(phone?: string): string {
    if (!phone || phone.length < 10) return '';
    const ddd = phone.slice(0, 2);
    const prefix = phone.length === 11 ? phone.slice(2, 7) : phone.slice(2, 6);
    const suffix = phone.slice(-4);
    return `(${ddd}) ${prefix}-${suffix}`;
  }

  formatString(value: string): string {
    if (!value) return '';
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
