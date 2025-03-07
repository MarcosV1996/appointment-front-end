import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // Importando ReactiveFormsModule aqui
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  isAuthenticated: boolean = false;

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    // Inicializa o formulário com os campos 'username' e 'password'
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    // Verifica se o token de autenticação existe no localStorage
    this.isAuthenticated = !!localStorage.getItem('authToken');
  }

  // Função chamada ao submeter o formulário de login
  onLogin() {
    this.loginError = null;
    this.loading = true;

    // Verifica se o formulário é válido
    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;

      // Realiza a requisição para a API de login
      this.http.post<any>('http://127.0.0.1:8000/api/login', { username, password })
        .subscribe(
          (response: any) => {
            this.loading = false;
            console.log('Resposta da API:', response);

            // Verifica se a resposta contém o token
            if (response && response.token) {
              // Armazenar o token e os dados do usuário no localStorage
              localStorage.setItem('authToken', response.token);
              if (response.user) {
                localStorage.setItem('userRole', response.user.role);
                localStorage.setItem('userId', response.user.id);
                // Redireciona dependendo do papel do usuário
                this.redirectUser(response.user.role);
              } else {
                this.loginError = 'Resposta incompleta da API: Não foi encontrado o usuário';
                console.error('Resposta incompleta da API:', response);
              }
            } else {
              this.loginError = 'Erro inesperado: Dados de autenticação incompletos.';
              console.error('Resposta incompleta da API:', response);
            }
          },
          error => {
            this.loading = false;
            this.handleLoginError(error);
          }
        );
    } else {
      this.loading = false;
      this.loginError = 'Por favor, preencha todos os campos.';
    }
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  // Função para tratar erros de login
  handleLoginError(error: any) {
    if (error.status === 401) {
      this.loginError = 'Credenciais inválidas. Verifique seu nome de usuário e senha.';
    } else {
      this.loginError = 'Erro ao fazer login. Tente novamente mais tarde.';
    }
    console.error('Erro de login:', error);
  }

  redirectUser(role: string) {
    if (role === 'admin' || role === 'employee') {
      this.router.navigate(['/appointments-list']).then(() => {
        window.location.reload(); 
      });
    } else {
      this.router.navigate(['/home']).then(() => {
        window.location.reload();
      });
    }
  }
  

  logout() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      })
    };

    this.http.post<any>('http://127.0.0.1:8000/api/logout', {}, httpOptions)
      .subscribe(
        response => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          this.isAuthenticated = false; // Atualiza o estado de autenticação
          this.router.navigate(['/login']);
        },
        error => {
          console.error('Erro ao fazer logout:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          this.isAuthenticated = false; // Atualiza o estado de autenticação mesmo em erro
          this.router.navigate(['/login']);
        }
      );
  }

  // Alterna a visibilidade da senha
  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
}
