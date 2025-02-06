import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css'],
})
export class NavBarComponent implements OnInit, OnDestroy {
  userRole: string | null = null;
  userName: string | null = null;
  userPhotoUrl: string | null = 'assets/img/default-user.png';
  private authStatusSub: Subscription | null = null;

  private photoBaseUrl = 'http://127.0.0.1:8000/storage/';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.updateUserRole();
    this.loadUserPhoto();
    this.fetchUserInfo();

    this.authStatusSub = this.authService.authStatus$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.updateUserRole();
        this.fetchUserInfo();
      } else {
        this.clearUserInfo();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.authStatusSub) {
      this.authStatusSub.unsubscribe();
    }
  }

  updateUserRole() {
    this.userRole = localStorage.getItem('userRole');
  }

  clearUserInfo() {
    this.userRole = null;
    this.userName = null;
    this.userPhotoUrl = 'assets/img/default-user.png';
    localStorage.removeItem('userPhotoUrl');
  }

  loadUserPhoto() {
    const savedPhotoUrl = localStorage.getItem('userPhotoUrl');
    if (savedPhotoUrl) {
      this.userPhotoUrl = savedPhotoUrl.startsWith('http') ? savedPhotoUrl : this.photoBaseUrl + savedPhotoUrl;
    }
  }

  fetchUserInfo() {
    const userId = localStorage.getItem('userId');

    if (userId) {
      this.http.get<{ id: number, username: string, role: string, photo: string | null }>(`/api/users/${userId}`).subscribe(
        (response) => {
          this.userName = this.capitalizeFirstLetter(response.username); // Formata o nome
          if (response.photo) {
            this.userPhotoUrl = response.photo.startsWith('http') ? response.photo : this.photoBaseUrl + response.photo;
            localStorage.setItem('userPhotoUrl', response.photo);
          } else {
            this.userPhotoUrl = 'assets/img/default-user.png';
          }
          this.cdr.detectChanges();
        },
        (error) => {
          console.error("Erro ao buscar informações do usuário:", error);
          this.clearUserInfo();
        }
      );
    }
  }

  // Função para capitalizar a primeira letra do nome
  capitalizeFirstLetter(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isEmployee(): boolean {
    return this.userRole === 'employee';
  }

  isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  logout() {
    this.authService.logout();
    this.clearUserInfo();
    this.router.navigate(['/login']);
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  openPhotoUploadModal() {
    document.getElementById('photoUploadInput')?.click();
  }

  uploadPhoto(event: any) {
    const file = event.target.files[0];
    const userId = localStorage.getItem('userId');
    if (file && userId) {
      const formData = new FormData();
      formData.append('photo', file);
  
      this.http.post<{ photo: string }>(`/api/users/${userId}/upload-photo`, formData).subscribe(
        (response) => {
          // Atualiza `userPhotoUrl` com o caminho completo e adiciona um parâmetro de tempo para evitar cache
          this.userPhotoUrl = `${this.photoBaseUrl}${response.photo}?timestamp=${new Date().getTime()}`;
          localStorage.setItem('userPhotoUrl', response.photo); // Salva o caminho da foto no localStorage
  
          this.cdr.detectChanges(); // Força a atualização visual
          location.reload(); // Recarrega a página após o upload da nova foto
        },
        (error) => {
          console.error('Erro ao fazer upload da foto:', error);
        }
      );
    } else {
      console.error("Erro: Arquivo ou ID do usuário ausente.");
    }
  }
  
}
