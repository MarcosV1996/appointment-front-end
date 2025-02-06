import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Estado {
  id: number;
  nome: string;
  sigla: string;
}

interface Cidade {
  id: number;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class IbgeService {
  private apiUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades';

  constructor(private http: HttpClient) {}

  getEstados(): Observable<Estado[]> {
    return this.http.get<Estado[]>(`${this.apiUrl}/estados`);
  }

  getCidadesPorEstado(estadoId: number): Observable<Cidade[]> {
    return this.http.get<Cidade[]>(`${this.apiUrl}/estados/${estadoId}/municipios`)
      .pipe(
        map(cidades => cidades.map(cidade => ({ id: cidade.id, nome: cidade.nome })))
      );
  }
}
