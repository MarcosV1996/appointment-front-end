import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.css'],
})
export class ManageUsersComponent implements OnInit {
  users: any[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  private readonly apiUrl = environment.apiUrl;

  // --- NOVAS VARIÁVEIS PARA O MODAL DE EXCLUSÃO ---
  isDeleteModalVisible: boolean = false;
  userToDelete: any | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;
    try {
      const options = await this.authService.getAuthenticatedRequestOptions();
      const response = await this.http.get<any[]>(`${this.apiUrl}/users`, options).toPromise();
      this.users = response || [];
    } catch (error: any) {
      this.handleError(error, 'Failed to load users');
    } finally {
      this.isLoading = false;
    }
  }

  openDeleteConfirmation(user: any): void {
    this.userToDelete = user;
    this.isDeleteModalVisible = true;
    this.errorMessage = null; 
  }

  cancelDelete(): void {
    this.isDeleteModalVisible = false;
    this.userToDelete = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.userToDelete) {
      return;
    }

    if (!this.authService.isAdmin()) {
      this.errorMessage = 'ACESSO NEGADO: Seu perfil não tem permissão para excluir usuários.';
      this.cancelDelete(); // Fecha o modal
      return;
    }

    const userId = this.userToDelete.id;

    try {
      const options = await this.authService.getAuthenticatedRequestOptions();
      await this.http.delete(`${this.apiUrl}/users/${userId}`, options).toPromise();

      this.users = this.users.filter(u => u.id !== userId);
    } catch (error) {
      console.error('ERRO COMPLETO AO DELETAR:', error);
      this.handleError(error as HttpErrorResponse, 'Erro ao deletar o usuário.');
    } finally {
      this.cancelDelete(); // Garante que o modal seja fechado após a tentativa
    }
  }

  private handleError(error: HttpErrorResponse, defaultMessage: string): void {
    console.error('Error:', error);
    if (error.status === 0) {
      this.errorMessage = 'Falha na conexão com o servidor.';
    } else if (error.status === 401) {
      this.errorMessage = 'Sessão expirada. Redirecionando para o login...';
      this.authService.logout();
      setTimeout(() => this.router.navigate(['/login']), 1500);
    } else if (error.status === 403) {
      this.errorMessage = 'Você não tem permissão para esta ação.';
    } else if (error.status === 404) {
      this.errorMessage = 'Recurso não encontrado.';
    } else if (error.status === 419) {
      this.errorMessage = 'Token da sessão expirado. A página será recarregada...';
      setTimeout(() => window.location.reload(), 1500);
    } else {
      this.errorMessage = error.error?.message || defaultMessage;
    }
  }

  editUser(user: any): void {
    this.router.navigate(['/edit-user', user.id]);
  }

  trackByUserId(index: number, user: any): number {
    return user.id;
  }
}