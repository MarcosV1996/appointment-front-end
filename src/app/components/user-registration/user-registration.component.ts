import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-registration',
  templateUrl: './user-registration.component.html',
  styleUrls: ['./user-registration.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class UserRegistrationComponent {
  registerForm: FormGroup;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  isModalVisible: boolean = false;
  isErrorModalVisible: boolean = false;
  isLoading: boolean = false;
  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });

    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      const emailControl = this.registerForm.get('email');
      if (role === 'admin') {
        emailControl?.setValidators([Validators.required, Validators.email]);
      } else {
        emailControl?.clearValidators();
      }
      emailControl?.updateValueAndValidity();
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(field: string) {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else if (field === 'confirmPassword') {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const userData = {
        ...this.registerForm.value,
        password_confirmation: this.registerForm.value.confirmPassword 
      };
      delete userData.confirmPassword; 

      await this.authService.register(userData);
      
      this.successMessage = 'Usuário registrado com sucesso!';
      this.isModalVisible = true;
      this.registerForm.reset();
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.status === 422) {
        if (error.error.errors?.username) {
          this.errorMessage = error.error.errors.username[0];
        } else if (error.error.errors?.email) {
          this.errorMessage = error.error.errors.email[0];
        } else if (error.error.errors?.password) {
          // Adiciona tratamento específico para erros de senha
          this.errorMessage = error.error.errors.password[0];
        } else {
          this.errorMessage = 'Dados inválidos. Verifique os campos.';
        }
      } else {
        this.errorMessage = 'Erro ao registrar. Tente novamente.';
      }
      
      this.isErrorModalVisible = true;
    } finally {
      this.isLoading = false;
    }
  }

  closeErrorModal() {
    this.isErrorModalVisible = false;
  }

  closeModal() {
    this.isModalVisible = false;
  }
}