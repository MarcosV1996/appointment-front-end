import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BedService {
  private beds = [
    { id: 1, bed_number: 'Cama 1', is_available: true, room_id: 1 },
    { id: 2, bed_number: 'Cama 2', is_available: true, room_id: 1 }, 
    { id: 3, bed_number: 'Cama 3', is_available: true, room_id: 1 },
    { id: 4, bed_number: 'Cama 4', is_available: true, room_id: 1 },
    { id: 5, bed_number: 'Cama 5', is_available: true, room_id: 2 },
    { id: 6, bed_number: 'Cama 6', is_available: true, room_id: 2 }, 
    { id: 7, bed_number: 'Cama 7', is_available: true, room_id: 2 },
    { id: 8, bed_number: 'Cama 8', is_available: true, room_id: 2 },
    { id: 9, bed_number: 'Cama 9', is_available: true, room_id: 3 },
    { id: 10, bed_number: 'Cama 10', is_available: true, room_id: 3 },
    { id: 11, bed_number: 'Cama 11', is_available: true, room_id: 3 },
    { id: 12, bed_number: 'Cama 12', is_available: true, room_id: 3 }
  ];

  getBedsByRoomId(roomId: number): Observable<{ id: number, bed_number: string, is_available: boolean }[]> {
    return of(this.beds).pipe(
      map(beds => beds.filter(bed => bed.room_id === roomId)) // Filtrar as camas pelo quarto selecionado
    );
  }
}
