import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authStatusListener = new Subject<boolean>(); // Emite eventos de mudança de autenticação
  authStatus$ = this.authStatusListener.asObservable();

  constructor() {}

  login(username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (username === 'admin' && password === 'admin') {
        localStorage.setItem('authToken', 'token'); // Exemplo de armazenamento do token
        localStorage.setItem('userRole', 'admin');  
        this.authStatusListener.next(true); 
        this.doubleReload(); 
        resolve({ success: true });
      } else {
        reject({ error: 'Invalid credentials' });
      }
    });
  }

  logout() {
    localStorage.clear(); // Limpa todas as chaves do localStorage
    this.authStatusListener.next(false);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  // Função para recarregar a página duas vezes
  private doubleReload() {
    console.log('Recarregando a página pela primeira vez...');
    setTimeout(() => {
      location.reload();
      setTimeout(() => {
        console.log('Recarregando a página pela segunda vez...');
        location.reload(); 
      }, 500);
    }, 500); 
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Retorna os headers de autenticação padrão
   * @returns Objeto com headers de autenticação
   */
  getAuthHeaders(): { [header: string]: string } {
    return {
      'Authorization': 'Bearer ' + this.getToken(),
      'Content-Type': 'application/json'
    };
  }

  /**
   * Verifica se o token está expirado
   * @returns boolean indicando se o token é válido
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Decodifica o payload do token JWT (simplificado)
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Verifica a expiração (timestamp em segundos)
      return payload.exp > Date.now() / 1000;
    } catch (e) {
      console.error('Erro ao decodificar token:', e);
      return false;
    }
  }
}