import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../services/services2/appointments.service';
import { Appointment } from '../models/appointment.model';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { IbgeService } from '../ibge.service';
import { NationalityService } from '../services/services2/nationality.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { RoomService } from '../services/services2/room.service';
import { BedService } from '../services/services2/bed.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-edit-list',
  standalone: true,
  templateUrl: './edit-list.component.html',
  styleUrls: ['./edit-list.component.css'],
  imports: [
    FormsModule,
    CommonModule,
    NavBarComponent,
    NgxMaskDirective
  ],
  providers: [
    provideNgxMask()
  ],
  animations: [
    trigger('modalAnimation', [
      state('void', style({
        opacity: 0,
        transform: 'scale(0.5)'
      })),
      transition(':enter', [
        animate('0.5s ease-out')
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({
          opacity: 0,
          transform: 'scale(0.5)'
        }))
      ])
    ])
  ]
})
export class EditListComponent implements OnInit, OnDestroy {
  @ViewChild('appointmentForm') appointmentForm!: NgForm;
  private destroy$ = new Subject<void>();

  appointment: Appointment = this.initializeNewAppointment();
  estados: any[] = [];
  cidades: any[] = [];
  rooms: { id: number, name: string }[] = [];
  beds: { id: number, bed_number: string, is_available: boolean, occupantName?: string }[] = [];
  filteredBeds: { id: number, bed_number: string, is_available: boolean, occupantName?: string }[] = [];
  occupiedBeds: { bedId: number, occupantName: string }[] = [];
  nacionalidades: string[] = [];
  isLoading: boolean = false;
  isSaving: boolean = false;
  showModal: boolean = false; // Mantido para o modal genérico existente
  modalMessage: string = ''; // Mantido para o modal genérico existente
  showSuccessModal: boolean = false; // Propriedade para controlar o novo modal de sucesso
  currentStep: number = 1;
  errorMessage: string = '';

  chronicDiseasesList: string[] = [
    'Diabetes',
    'Hipertensão',
    'Asma',
    'Doença Renal Crônica',
    'Doença Cardíaca',
    'Câncer',
    'Outra'
  ];

  constructor(
    private appointmentService: AppointmentService,
    private ibgeService: IbgeService,
    private nationalityService: NationalityService,
    private roomService: RoomService, 
    private bedService: BedService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadAppointmentData();
    this.loadInitialData();
  }

  // Métodos de inicialização
  private initializeNewAppointment(): Appointment {
    return {
      id: 0,
      name: '',
      last_name: '',
      cpf: '',
      date: new Date().toISOString().split('T')[0],
      mother_name: '',
      arrival_date: new Date().toISOString(),
      time: '',
      state: '',
      city: '',
      phone: '',
      accommodation_mode: '',
      observation: '',
      photo: null,
      gender: '',
      additionalInfo: this.initializeAdditionalInfo()
    };
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
      nationality: 'Brasil',
      room_id: null,
      bed_id: null,
      stay_duration: 0,
      exit_date: ''
    };
  }

  // Métodos de navegação entre steps
  goToStep(step: number): void {
    if (step >= 1 && step <= 3) {
      this.currentStep = step;
    }
  }

  nextStep(): void {
    if (!this.validateFields()) {
      this.errorMessage = "Por favor, preencha todos os campos obrigatórios.";
      this.notificationService.showError(this.errorMessage);
      return;
    }
    if (this.currentStep < 3) {
      this.currentStep++;
      this.errorMessage = '';
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private validateFields(): boolean {
    if (this.appointmentForm) {
      Object.values(this.appointmentForm.controls).forEach(control => {
        control.markAsTouched();
      });
    }
    return this.appointmentForm?.valid ?? false;
  }

  // Métodos de manipulação de eventos
  onEstadoChange(nomeEstado: string): void {
    const estadoSelecionado = this.estados.find(estado => estado.nome === nomeEstado);
    if (estadoSelecionado) {
      this.appointment.state = estadoSelecionado.id.toString();
      this.loadCidades(estadoSelecionado.id);
    } else {
      this.appointment.state = '';
      this.cidades = [];
    }
  }

  onRoomChange(event: Event): void {
    const roomId = Number((event.target as HTMLSelectElement).value);
    if (!roomId || isNaN(roomId)) {
      console.error('ID do quarto é inválido');
      return;
    }
    this.appointment.additionalInfo.room_id = roomId;
    this.loadBeds(roomId);
  }

  // Métodos de carregamento de dados
  private checkAuthentication(): void {
    if (!this.authService.isLoggedIn()) {
      this.notificationService.showError('Sessão expirada. Por favor, faça login novamente.');
      this.router.navigate(['/login']);
    }
  }

  private loadAppointmentData(): void {
    const appointmentId = Number(this.route.snapshot.paramMap.get('id'));
    
    if (appointmentId) {
      this.fetchAppointment(appointmentId);
    } else {
      this.handleMissingAppointmentId();
    }
  }

  private fetchAppointment(id: number): void {
    this.isLoading = true;
    
    this.appointmentService.getAppointment(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => this.handleAppointmentResponse(response),
        error: (error) => this.handleAppointmentError(error)
      });
  }

  private handleAppointmentResponse(response: Appointment): void {
    if (!response) {
      throw new Error('Resposta vazia da API');
    }
    
    this.appointment = response;
    this.appointment.additionalInfo = response.additionalInfo ?? this.initializeAdditionalInfo();
    
    if (this.appointment.state) {
      this.loadCidades(Number(this.appointment.state));
    }
  }

  private handleAppointmentError(error: any): void {
    console.error('Erro ao carregar agendamento:', error);
    this.handleError(error);
  }

  private handleMissingAppointmentId(): void {
    console.error('ID do agendamento não fornecido na rota');
    this.notificationService.showError('ID do agendamento não encontrado');
    this.router.navigate(['/appointments-list']);
  }

  private loadInitialData(): void {
    this.loadEstados();
    this.loadRooms();
    this.loadNationalities();
    this.loadOccupiedBeds();
  }

  private loadOccupiedBeds(): void {
    this.appointmentService.getAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => this.processOccupiedBeds(appointments),
        error: (error) => this.handleOccupiedBedsError(error)
      });
  }

  private processOccupiedBeds(appointments: Appointment[]): void {
    this.occupiedBeds = appointments
      .filter(app => app.additionalInfo?.bed_id != null)
      .map(app => ({
        bedId: app.additionalInfo!.bed_id as number,
        occupantName: `${app.name} ${app.last_name}`
      }));

    if (this.appointment.additionalInfo?.room_id) {
      this.loadBeds(this.appointment.additionalInfo.room_id);
    }
  }

  private handleOccupiedBedsError(error: HttpErrorResponse): void {
    console.error('Erro ao carregar agendamentos:', error);
    this.notificationService.showError('Erro ao carregar dados das camas ocupadas');
  }

  private loadBeds(roomId: number): void {
    this.bedService.getBedsByRoomId(roomId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.processBedsData(data),
        error: (error) => this.handleBedsError(error)
      });
  }

  private processBedsData(data: any[]): void {
    this.filteredBeds = data.map(bed => {
      const occupiedBed = this.occupiedBeds.find(occupied => occupied.bedId === bed.id);
      return {
        ...bed,
        is_available: !occupiedBed,
        occupantName: occupiedBed ? occupiedBed.occupantName : ''
      };
    });
  }

  private handleBedsError(error: HttpErrorResponse): void {
    console.error("Erro ao carregar camas:", error.message);
    this.notificationService.showError('Erro ao carregar dados das camas');
  }

  private loadNationalities(): void {
    this.nationalityService.getNationalities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.processNationalities(response),
        error: (error) => this.handleNationalitiesError(error)
      });
  }

  private processNationalities(response: any[]): void {
    this.nacionalidades = response
      .map(country => country.name.common === 'Brazil' ? 'Brasil' : country.name.common)
      .sort();
  }

  private handleNationalitiesError(error: any): void {
    this.nacionalidades = ['Brasil', 'Argentina', 'Chile', 'Uruguai', 'Paraguai'];
  }

  private loadEstados(): void {
    this.ibgeService.getEstados()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.estados = data,
        error: (error) => this.handleEstadosError(error)
      });
  }

  private handleEstadosError(error: HttpErrorResponse): void {
    console.error("Erro ao carregar estados:", error.message);
    this.notificationService.showError('Erro ao carregar lista de estados');
  }

  private loadCidades(estadoId: number): void {
    this.ibgeService.getCidadesPorEstado(estadoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.cidades = data,
        error: (error) => this.handleCidadesError(error)
      });
  }

  private handleCidadesError(error: HttpErrorResponse): void {
    console.error("Erro ao carregar cidades:", error.message);
    this.notificationService.showError('Erro ao carregar lista de cidades');
  }

  private loadRooms(): void {
    this.roomService.getRooms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.rooms = data,
        error: (error) => this.handleRoomsError(error)
      });
  }

  private handleRoomsError(error: HttpErrorResponse): void {
    console.error('Erro ao carregar quartos:', error.message);
    this.notificationService.showError('Erro ao carregar lista de quartos');
  }

  // Métodos de manipulação de formulário
  async onSubmit(): Promise<void> {
    if (!this.validateForm()) return;

    this.isSaving = true;
    
    try {
      await this.saveAppointment();
      
      // Exibir o modal de sucesso
      this.showSuccessModal = true;
      
      // Esconder o modal após 3 segundos e redirecionar
      setTimeout(() => {
        this.showSuccessModal = false;
        this.router.navigate(['/appointments-list']);
      }, 3000); // 3000 milissegundos = 3 segundos

    } catch (error) {
      this.handleSaveError(error);
    } finally {
      this.isSaving = false;
    }
  }

  private validateForm(): boolean {
    if (!this.appointment?.id) {
      this.notificationService.showError('ID do agendamento não encontrado');
      return false;
    }
    
    if (this.appointmentForm && !this.appointmentForm.valid) {
      this.errorMessage = "Por favor, preencha todos os campos obrigatórios.";
      this.notificationService.showError(this.errorMessage);
      return false;
    }
    
    return true;
  }

  private async saveAppointment(): Promise<void> {
    try {
      await this.authService.ensureCsrfToken();
      
      // Se está sendo colocado em uma cama/quarto, marcar como não oculto
      if (this.appointment.additionalInfo?.bed_id && this.appointment.additionalInfo?.room_id) {
        this.appointment.isHidden = false;
      }
      
      const response = await this.appointmentService.updateAppointment(
        this.appointment.id, 
        this.appointment
      ).pipe(takeUntil(this.destroy$)).toPromise();
      
      return response;
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      throw error;
    }
  }

  private handleSaveError(error: any): void {
    console.error('Erro ao atualizar:', error);
    
    if (error.status === 419) {
      this.notificationService.showError('Sessão expirada. Tentando novamente...');
      // Tentar renovar o token CSRF e tentar novamente
      setTimeout(async () => {
        try {
          await this.authService.ensureCsrfToken();
          await this.onSubmit();
        } catch (err) {
          this.notificationService.showError('Erro persistente. Por favor, faça login novamente.');
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      }, 1000);
    } else {
      this.handleError(error);
    }
  }

  private handleError(error: any): void {
    if (error.status === 401) {
      this.notificationService.showError('Sessão expirada. Por favor, faça login novamente.');
      this.authService.logout();
      this.router.navigate(['/login']);
    } else {
      const message = error.message || 'Erro ao processar a solicitação. Tente novamente.';
      this.notificationService.showError(message);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.appointment.photo = file;
    }
  }

  formatString(value: string): string {
    if (!value) return '';
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  updateAppointment(): void {
    if (!this.appointment.id) {
      console.error('Erro: ID do agendamento indefinido.');
      this.notificationService.showError('ID do agendamento não encontrado');
      return;
    }
  
    this.appointmentService.updateAppointment(this.appointment.id, this.appointment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Exibir o modal de sucesso
          this.showSuccessModal = true;
          setTimeout(() => {
            this.showSuccessModal = false;
            this.router.navigate(['/appointments-list']);
          }, 3000); 
        },
        error: (error) => {
          console.error('Erro ao atualizar o agendamento:', error);
          this.handleError(error);
        }
      });
  }

  hideAppointment(id: number): void {
    this.appointmentService.hideAppointment(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(`Agendamento ${id} ocultado com sucesso.`);
        },
        error: (error) => {
          console.error('Erro ao ocultar agendamento:', error);
          this.notificationService.showError('Erro ao ocultar agendamento');
        }
      });
  }
  
  updateVisibility(id: number, isHidden: boolean): void {
    this.appointmentService.updateVisibility(id, isHidden)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(`Visibilidade do agendamento ${id} atualizada.`);
        },
        error: (error) => {
          console.error('Erro ao atualizar visibilidade:', error);
          this.notificationService.showError('Erro ao atualizar visibilidade');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}