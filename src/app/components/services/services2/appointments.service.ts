import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment } from '../../models/appointment.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private baseUrl = 'http://127.0.0.1:8000/api/appointments';

  constructor(private http: HttpClient) { }

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.baseUrl);
  }

  updateAppointment(id: number, appointment: Appointment): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, appointment);
  }

  hideAppointment(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/hide`, {});
  }
  
  updateVisibility(id: number, isHidden: boolean): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/hide`, { isHidden });
  }

  getAvailableBeds(): Observable<{ availableBeds: number }> {
    return this.http.get<{ availableBeds: number }>(`${this.baseUrl}/available-beds`);
  }
}
