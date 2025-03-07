import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));

    this.userForm = this.fb.group({
      name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.email]],
      password: [''],
      confirmPassword: [''], 
      role: ['', Validators.required]
    });

    this.loadUserData();
  }

  loadUserData() {
    this.http.get(`/api/users/${this.userId}`).subscribe(
      (user: any) => {
        this.userForm.patchValue({
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role
        });
      },
      (error) => console.error('Erro ao carregar usuário:', error)
    );
  }

  updateUser() {
    if (this.userForm.valid) {
      this.http.put(`/api/users/${this.userId}`, this.userForm.value).subscribe(
        () => {
          alert('Usuário atualizado com sucesso!');
          this.router.navigate(['/manage-users']);
        },
        (error) => console.error('Erro ao atualizar usuário:', error)
      );
    }
  }

  // Alternar visibilidade da senha
  togglePasswordVisibility(field: string) {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else if (field === 'confirmPassword') {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }
}
