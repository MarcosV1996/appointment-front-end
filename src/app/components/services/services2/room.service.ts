import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  getRooms(): Observable<{ id: number, name: string }[]> {
    // Alterar os IDs para números para corresponder aos IDs do BedService
    return of([
      { id: 1, name: 'Quarto A' },
      { id: 2, name: 'Quarto B' },
      { id: 3, name: 'Quarto C' }
    ]);
  }
}
