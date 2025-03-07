import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule,],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'] // <--- Veja se essa linha existe!
})
export class ForgotPasswordComponent {
  email: string = '';
  constructor(private http: HttpClient,private router: Router) {}

  sendResetLink() {
    this.http.post('/api/forgot-password', { email: this.email }).subscribe({
      next: (res: any) => alert(res.message),
      error: (err) => alert(err.error.message)
    });

   
  }
  goToLogin() {
    this.router.navigate(['/']);
  }
}
