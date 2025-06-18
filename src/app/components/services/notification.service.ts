import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  showSuccess(message: string): void {
    alert('Sucesso: ' + message); 
  }

  showError(message: string): void {
    alert('Erro: ' + message);
  }

  showWarning(message: string): void {
    alert('Aviso: ' + message);
  }
}