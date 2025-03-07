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
    return this.http.get<any[]>(`${this.apiUrl}/estados/${estadoId}/municipios`).pipe(
      map((cidades) => {
        if (!cidades || cidades.length === 0) {
          console.warn('Nenhuma cidade encontrada para este estado.');
          return [{ id: -1, nome: 'Nenhuma cidade encontrada' }];
        }
  
        const cidadesFormatadas = cidades.map(cidade => ({
          id: Number(cidade.id), 
          nome: cidade.nome
        }));
  
        return [{ id: -1, nome: 'Selecione uma cidade' }, ...cidadesFormatadas];
      })
    );
  }
  
  
}
