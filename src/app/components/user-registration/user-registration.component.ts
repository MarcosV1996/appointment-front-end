import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../services/services.service';
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
  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;
  isErrorModalVisible: boolean = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required], 
      username: ['', Validators.required],
      email: [''],  
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['', Validators.required]
    });

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

  togglePasswordVisibility(field: string) {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else if (field === 'confirmPassword') {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.userService.registerUser(this.registerForm.value).subscribe(
        response => {
          this.successMessage = 'Usuário registrado com sucesso!';
          this.errorMessage = null;
          this.registerForm.reset();
          this.isModalVisible = true;
        },
        error => {
          if (error.status === 409) {
            this.errorMessage = error.error.message;
            this.isErrorModalVisible = true; 
          } else {
            this.errorMessage = 'Erro ao registrar o usuário. Tente novamente.';
            this.isErrorModalVisible = true; 
          }
          this.successMessage = null;
        }
      );
    }
  }
  
  closeErrorModal() {
    this.isErrorModalVisible = false;
  }
  
  closeModal() {
    this.isModalVisible = false;
  }
}
