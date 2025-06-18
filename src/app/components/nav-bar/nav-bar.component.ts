import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  userPhotoUrl: string = 'assets/img/default-user.png';
  isLoggedIn: boolean = false;
  isMenuCollapsed: boolean = true;
  
  private authSub: Subscription;
  private photoBaseUrl: string = 'http://localhost:8000/storage/';

  constructor(
    public router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    public authService: AuthService
  ) {
    this.authSub = new Subscription();
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    this.authSub = this.authService.authStatus$.subscribe((loggedIn: boolean) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.loadUserData();
      } else {
        this.clearUserData();
      }
      this.cdr.detectChanges();
    });

    if (this.isLoggedIn) {
      this.loadUserData();
    }
  }

  ngOnDestroy(): void {
    this.authSub.unsubscribe();
  }

  private loadUserData(): void {
    this.userRole = this.authService.getUserRole();
    const userData = localStorage.getItem('user');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.userName = this.capitalizeFirstLetter(user.username);
        this.loadUserPhoto();
        this.fetchUpdatedUserInfo();
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }

  private clearUserData(): void {
    this.userRole = null;
    this.userName = null;
    this.userPhotoUrl = 'assets/img/default-user.png';
  }

  private loadUserPhoto(): void {
    const user = this.authService.getUser();
    if (user?.photo) {
        const photoUrl = this.authService.processPhotoUrl(user.photo);
        this.userPhotoUrl = photoUrl;
        localStorage.setItem('userPhotoUrl', photoUrl);
    } else {
        this.userPhotoUrl = 'assets/img/default-user.png';
    }
}


  private processPhotoUrl(url: string): string {
    if (!url || url.includes('default-user.png')) {
      return url;
    }
    
    // Corrige o caminho se estiver errado
    const correctedUrl = url.replace('profile-photos', 'photos');
    const cleanUrl = correctedUrl.split('?')[0];
    
    return `${cleanUrl}?t=${Date.now()}`;
  }

  private fetchUpdatedUserInfo(): void {
    const token = this.authService.getToken();
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.http.get<{ username: string, role: string, photo: string | null }>(
          `http://localhost:8000/api/users/${user.id}`,
          {
            headers: new HttpHeaders({
              'Authorization': `Bearer ${token}`
            })
          }
        ).subscribe({
          next: (response) => {
            this.userName = this.capitalizeFirstLetter(response.username);
            this.userRole = response.role;
            
            if (response.photo) {
              const newPhotoUrl = response.photo.startsWith('http') 
                ? response.photo 
                : `${this.photoBaseUrl}${response.photo}`;
              this.userPhotoUrl = this.processPhotoUrl(newPhotoUrl);
              localStorage.setItem('userPhotoUrl', this.userPhotoUrl);
            }
            
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error("Error fetching user info:", err);
          }
        });
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }

  async uploadPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const user = this.authService.getUser();

    if (file && user?.id) {
      try {
        const { photoUrl, photoPath } = await this.authService.uploadUserPhoto(user.id, file);
        
        const currentUser = this.authService.getUser();
        currentUser.photo = photoPath;
        
        this.authService.storeAuthData(this.authService.getToken() || '', currentUser);
        
        const newPhotoUrl = this.processPhotoUrl(photoUrl);
        this.userPhotoUrl = newPhotoUrl;
        localStorage.setItem('userPhotoUrl', newPhotoUrl);
        
        this.cdr.detectChanges();
        await this.authService.refreshUserData();
        this.loadUserData();
        
        console.log('Photo updated successfully:', {
          newUrl: newPhotoUrl,
          storage: localStorage.getItem('userPhotoUrl')
        });

        setTimeout(() => {
          if (!this.isImageLoaded()) {
            console.warn('Photo not loaded, forcing reload');
            window.location.reload();
          }
        }, 1000);
        
      } catch (error: unknown) {
        console.error('Error uploading photo:', error);
        let errorMessage = 'Unknown error occurred';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        alert('Error updating photo: ' + errorMessage);
      }
    }
  }

  private isImageLoaded(): boolean {
    const img = document.querySelector('img.user-photo') as HTMLImageElement;
    return img?.complete && img?.naturalWidth > 0;
  }

  handleImageError(): void {
    console.error('Error loading image:', this.userPhotoUrl);
    this.userPhotoUrl = 'assets/img/default-user.png';
    this.cdr.detectChanges();
  }

  capitalizeFirstLetter(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  isEmployee(): boolean {
    return this.userRole === 'employee';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openPhotoUploadModal(): void {
    document.getElementById('photoUploadInput')?.click();
  }

  toggleMenu(): void {
    this.isMenuCollapsed = !this.isMenuCollapsed;
  }

  closeMenu(): void {
    this.isMenuCollapsed = true;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}