import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditListComponent } from './edit-list.component';
import { AppointmentService } from '../services/services2/appointments.service';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Appointment } from '../models/appointment.model';

describe('EditListComponent', () => {
  let component: EditListComponent;
  let fixture: ComponentFixture<EditListComponent>;
  let appointmentService: jasmine.SpyObj<AppointmentService>;
  let mockRoute: any;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Criando um mock para o AppointmentService
    appointmentService = jasmine.createSpyObj('AppointmentService', [
      'getAppointments',
      'updateAppointment',
      'hideAppointment',
      'updateVisibility',
      'getAvailableBeds'
    ]);

    // Criando um mock para o Router
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Simulando a rota com um ID válido
    mockRoute = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'id' ? '1' : null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, EditListComponent], 
      providers: [
        { provide: AppointmentService, useValue: appointmentService },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditListComponent);
    component = fixture.componentInstance;
  });

  beforeEach(() => {
    // Mockando retorno do serviço
    const mockAppointments: Appointment[] = [
      {
        id: 1,
        name: 'Diego',
        last_name: 'Marczal',
        cpf: '12345678900',
        date: '2025-02-02',
        arrival_date: '2025-02-02',
        time: '12:00',
        birth_date: '1990-01-01',
        state: 'SP',
        city: 'São Paulo',
        mother_name: 'Maria Doe',
        phone: '999999999',
        observation: 'Nenhuma',
        gender: 'Masculino',
        foreign_country: false,
        noPhone: false,
        isHidden: false,
        replace: false,
        showMore: false,
        photo: 'path/to/photo',
        additionalInfo: {
          ethnicity: 'Branco',
          addictions: 'Nenhum',
          is_accompanied: false,
          benefits: 'Nenhum',
          is_lactating: false,
          has_disability: false,
          reason_for_accommodation: 'Professor',
          has_religion: true,
          religion: 'Católico',
          has_chronic_disease: false,
          chronic_disease: '',
          education_level: 'Ensino Superior completo',
          nationality: 'Brasileiro',
          room_id: 2,
          bed_id: 101,
          stay_duration: 30,
          roomDisplayName: 'Quarto 2',
          bedDisplayName: 'Cama 101',
        },
      }
    ];

    appointmentService.getAppointments.and.returnValue(of(mockAppointments));
    appointmentService.updateAppointment.and.returnValue(of({}));
    appointmentService.hideAppointment.and.returnValue(of({}));
    appointmentService.updateVisibility.and.returnValue(of({}));

    // Mockando um token para evitar erro de autenticação
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'auth_token') {
        return 'fake-token'; // Simula um token válido
      }
      return null;
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getAppointments on initialization', () => {
    component.ngOnInit();

    expect(appointmentService.getAppointments).toHaveBeenCalled();
    expect(component.occupiedBeds.length).toBe(1);
  });

  it('should handle error if getAppointments fails', () => {
    spyOn(console, 'error');
    appointmentService.getAppointments.and.returnValue(throwError(() => new Error('API Error')));

    component.ngOnInit();

    expect(console.error).toHaveBeenCalledWith('Erro ao carregar agendamentos:', jasmine.any(Error));
  });

  it('should update appointment and navigate', () => {
    spyOn(component, 'updateAppointment').and.callThrough();

    appointmentService.updateAppointment.and.returnValue(of({}));

    component.appointment = { id: 1, name: 'Updated Name' } as any;
    component.updateAppointment();

    expect(appointmentService.updateAppointment).toHaveBeenCalledWith(1, component.appointment);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/appointments-list']);
  });

  it('should handle updateAppointment error', () => {
    spyOn(console, 'error');
    appointmentService.updateAppointment.and.returnValue(throwError(() => new Error('Update Error')));

    component.appointment = { id: 1, name: 'Updated Name' } as any;
    component.updateAppointment();

    expect(console.error).toHaveBeenCalledWith('Erro ao atualizar o agendamento:', jasmine.any(Error));
  });

  it('should log error when trying to update appointment with no ID', () => {
    spyOn(console, 'error');

    component.appointment = {} as any;
    component.updateAppointment();

    expect(console.error).toHaveBeenCalledWith('Erro: ID do agendamento indefinido.');
  });

  it('should call hideAppointment method', () => {
    spyOn(component, 'hideAppointment').and.callThrough();
    appointmentService.hideAppointment.and.returnValue(of({}));

    component.hideAppointment(1);

    expect(appointmentService.hideAppointment).toHaveBeenCalledWith(1);
  });

  it('should handle hideAppointment error', () => {
    spyOn(console, 'error');
    appointmentService.hideAppointment.and.returnValue(throwError(() => new Error('Hide Error')));

    component.hideAppointment(1);

    expect(console.error).toHaveBeenCalledWith('Erro ao ocultar agendamento:', jasmine.any(Error));
  });

  it('should call updateVisibility method', () => {
    spyOn(component, 'updateVisibility').and.callThrough();
    appointmentService.updateVisibility.and.returnValue(of({}));

    component.updateVisibility(1, true);

    expect(appointmentService.updateVisibility).toHaveBeenCalledWith(1, true);
  });

  it('should handle updateVisibility error', () => {
    spyOn(console, 'error');
    appointmentService.updateVisibility.and.returnValue(throwError(() => new Error('Visibility Error')));

    component.updateVisibility(1, true);

    expect(console.error).toHaveBeenCalledWith('Erro ao atualizar visibilidade:', jasmine.any(Error));
  });

});
