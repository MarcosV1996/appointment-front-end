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
  
}
