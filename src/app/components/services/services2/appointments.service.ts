import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap, retryWhen, delay, take, map } from 'rxjs/operators';
import { Appointment } from '../../models/appointment.model';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private baseUrl = 'http://localhost:8000/api/appointments';
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000;

  constructor(
    private http: HttpClient,
    private authService: AuthService 
  ) { }

  private async getRequestOptions(): Promise<{
    headers: HttpHeaders,
    withCredentials: boolean
  }> {
    try {
      await this.authService.ensureCsrfToken();
    } catch (error) {
      console.error('Erro ao obter CSRF token:', error);
    }
    
    return {
      headers: this.getAuthHeaders(),
      withCredentials: true
    };
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-XSRF-TOKEN': this.authService.getCsrfToken() || ''
    });
  }

  getAppointments(): Observable<Appointment[]> {
    return from(this.getRequestOptions()).pipe(
      switchMap(options => this.http.get<Appointment[]>(this.baseUrl, options)),
      this.handleCsrfErrors()
    );
  }

  getAppointment(id: number): Observable<Appointment> {
    return from(this.getRequestOptions()).pipe(
      switchMap(options => this.http.get<Appointment>(`${this.baseUrl}/${id}`, options)),
      this.handleCsrfErrors()
    );
  }

  updateAppointment(id: number, appointment: Appointment): Observable<any> {
    return from(this.getRequestOptions()).pipe(
      switchMap(options => this.http.put(`${this.baseUrl}/${id}`, appointment, options)),
      this.handleCsrfErrors()
    );
  }

  hideAppointment(id: number): Observable<any> {
    return from(this.getRequestOptions()).pipe(
      switchMap(options => this.http.patch(`${this.baseUrl}/${id}/hide`, {}, options)),
      this.handleCsrfErrors()
    );
  }
  
  updateVisibility(id: number, isHidden: boolean): Observable<any> {
    return from(this.getRequestOptions()).pipe(
      switchMap(options => this.http.put(`${this.baseUrl}/${id}/hide`, { isHidden }, options)),
      this.handleCsrfErrors()
    );
  }

  getAvailableBeds(): Observable<{ 
    availableBeds: number, 
    totalBeds: number,
    occupiedBeds: number,
    rooms: {
      A: { available: number, occupied: number },
      B: { available: number, occupied: number },
      C: { available: number, occupied: number }
    }
  }> {
    return from(this.getRequestOptions()).pipe(
      switchMap(options => 
        this.http.get<any>(`${this.baseUrl}/available-beds`, options).pipe(
          map(response => ({
            availableBeds: response.availableBeds || 0,
            totalBeds: response.totalBeds || 12,
            occupiedBeds: response.occupiedBeds || 0,
            rooms: response.rooms || {
              A: { available: 0, occupied: 0 },
              B: { available: 0, occupied: 0 },
              C: { available: 0, occupied: 0 }
            }
          })),
          catchError(error => {
            console.error('Erro ao buscar vagas:', error);
            // Retorno padrão em caso de erro
            return of({
              availableBeds: 0,
              totalBeds: 12,
              occupiedBeds: 0,
              rooms: {
                A: { available: 0, occupied: 0 },
                B: { available: 0, occupied: 0 },
                C: { available: 0, occupied: 0 }
              }
            });
          })
        )
      ),
      this.handleCsrfErrors()
    );
  }

  private handleCsrfErrors<T>() {
    return (source: Observable<T>) => source.pipe(
      retryWhen(errors => errors.pipe(
        switchMap((error, index) => {
          if (error.status === 419 && index < this.MAX_RETRIES) {
            return from(this.authService.ensureCsrfToken()).pipe(
              delay(this.RETRY_DELAY)
            );
          }
          return throwError(() => this.handleError(error));
        }),
        take(this.MAX_RETRIES + 1)
      )),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  private handleError(error: any): Error {
    console.error('Erro na requisição:', error);
    
    if (error.status === 401) {
      this.authService.logout();
      return new Error('Sessão expirada. Por favor, faça login novamente.');
    } else if (error.status === 403) {
      return new Error('Acesso não autorizado.');
    } else if (error.status === 419) {
      return new Error('Problema de segurança. Por favor, tente novamente.');
    } else if (error.status === 0) {
      return new Error('Erro de conexão. Verifique sua internet.');
    } else {
      return new Error(error.message || 'Erro desconhecido. Tente novamente.');
    }
  }
}