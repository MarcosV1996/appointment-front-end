import { TestBed } from '@angular/core/testing';
import { AppointmentService } from './appointments.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AppointmentsService', () => {
  let service: AppointmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // Certificando-se de que HttpClientTestingModule é importado corretamente
      providers: [AppointmentService], // Garantindo que o serviço seja provido corretamente
    });

    service = TestBed.inject(AppointmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
