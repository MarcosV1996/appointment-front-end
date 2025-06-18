import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { environment } from '../environments/environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css'],
})
export class EditUserComponent implements OnInit {
  userForm!: FormGroup;
  userId!: number;
  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  apiUrl: string = environment.apiUrl;

  // Propriedades para o modal de sucesso
  isSuccessModalVisible: boolean = false;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.initializeForm();
    this.loadUserData();
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      confirmPassword: [''],
      role: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    if (password && password !== confirmPassword) {
        form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    } else {
        if (form.get('confirmPassword')?.hasError('passwordMismatch')) {
            form.get('confirmPassword')?.setErrors(null);
        }
    }
    return null;
}


  async loadUserData() {
    this.isLoading = true;
    this.errorMessage = null;
    const requestUrl = `${this.apiUrl}/users/${this.userId}`;

    try {
      const options = await this.authService.getAuthenticatedRequestOptions();
      const user = await lastValueFrom(this.http.get<any>(requestUrl, options));
      this.userForm.patchValue(user);
    } catch (error) {
      this.handleError(error, 'Erro ao carregar os dados do usuário.');
    } finally {
      this.isLoading = false;
    }
  }

  async updateUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;

    const userData = { ...this.userForm.value };
    delete userData.confirmPassword;
    if (!userData.password) {
      delete userData.password;
    }

    const requestUrl = `${this.apiUrl}/users/${this.userId}`;
    try {
      const options = await this.authService.getAuthenticatedRequestOptions();
      await lastValueFrom(this.http.put(requestUrl, userData, options));
      
      // Ativa o modal de sucesso em vez de usar alert()
      this.isLoading = false;
      this.successMessage = 'Usuário atualizado com sucesso!';
      this.isSuccessModalVisible = true;

    } catch (error) {
      this.handleError(error, 'Erro ao atualizar o usuário.');
    } finally {
      // Garante que o loading seja desativado mesmo se houver erro
      this.isLoading = false;
    }
  }

  private handleError(error: any, defaultMessage: string) {
    console.error(defaultMessage, error);
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 419) {
        this.errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
        this.authService.logout();
        setTimeout(() => this.router.navigate(['/login']), 2500);
      } else if (error.status === 422 && error.error?.errors) {
        const backendErrors = error.error.errors;
        const firstErrorKey = Object.keys(backendErrors)[0];
        this.errorMessage = backendErrors[firstErrorKey][0];
      } else {
        this.errorMessage = error.error?.message || defaultMessage;
      }
    } else {
      this.errorMessage = defaultMessage;
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  closeSuccessModal(): void {
    this.isSuccessModalVisible = false;
    this.router.navigate(['/manage-users']);
  }

  onCancel(): void {
    this.router.navigate(['/manage-users']);
  }
}