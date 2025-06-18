import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loginError: string | null = null;
  loading = false;
  passwordVisible = false;
  isAuthenticated = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    this.checkAuthStatus();
  }

  async onLogin() {
    this.loginError = null;
    
    if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        this.loginError = 'Por favor, preencha todos os campos corretamente';
        return;
    }

    this.loading = true;

    try {
        const { username, password } = this.loginForm.value;
        await this.authService.login(username, password);
        // O redirecionamento agora é tratado pelo AuthService
    } catch (error: any) {
        this.handleLoginError(error);
    } finally {
        this.loading = false;
    }
}

  private handleLoginSuccess(role: string): void {
    this.isAuthenticated = true;
    this.redirectUser(role);
  }

  private handleLoginError(error: any): void {
    console.error('Erro no login:', error);
    
    if (error.error?.errors) {
      // Handle validation errors from backend
      const errors = error.error.errors;
      this.loginError = Object.values(errors).flat().join('\n');
    } else if (error.status === 401) {
      this.loginError = 'Usuário ou senha inválidos';
    } else if (error.status === 0) {
      this.loginError = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    } else if (error.error?.message) {
      this.loginError = error.error.message;
    } else {
      this.loginError = 'Ocorreu um erro durante o login. Por favor, tente novamente mais tarde.';
    }
  }

  private checkAuthStatus(): void {
    this.isAuthenticated = this.authService.isLoggedIn();
    if (this.isAuthenticated) {
      const userRole = this.authService.getUserRole();
      if (userRole) {
        this.redirectUser(userRole);
      }
    }
  }

  private redirectUser(role: string): void {
    // Redireciona admin e employee diretamente para appointments-list
    if (role === 'admin' || role === 'employee') {
      this.router.navigate(['/appointments-list']);
    } 
    // Redireciona usuários comuns para home
    else {
      this.router.navigate(['/home']);
    }
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Helper to display form validation errors
  getFormControlErrors(controlName: string): string[] {
    const control = this.loginForm.get(controlName);
    if (control?.invalid && (control.dirty || control.touched)) {
      return Object.keys(control.errors || {}).map(error => {
        switch (error) {
          case 'required': return 'Este campo é obrigatório';
          case 'minlength': return `Mínimo de ${control.errors?.['minlength']?.requiredLength} caracteres`;
          default: return 'Valor inválido';
        }
      });
    }
    return [];
  }
}