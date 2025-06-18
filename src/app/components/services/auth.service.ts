import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authStatusListener = new Subject<boolean>();
  public authStatus$ = this.authStatusListener.asObservable();
  private readonly photoBaseUrl = 'http://localhost:8000/storage/photos/';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly API_URL = 'http://localhost:8000/api';
  private csrfToken: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuthState();
  }

  public async ensureCsrfToken(): Promise<void> {
    if (this.csrfToken && this.csrfToken.length > 0) {
      return;
    }
    
    try {
      await this.http.get(
        `${this.API_URL}/sanctum/csrf-cookie`,
        { 
          withCredentials: true,
          headers: new HttpHeaders({
            'Accept': 'application/json',
          })
        }
      ).toPromise();
      
      this.csrfToken = this.getFreshCsrfToken();
      
      if (!this.csrfToken) {
        throw new Error('Falha ao obter o token CSRF.');
      }
    } catch (error) {
      console.error('Erro ao obter token CSRF:', error);
      throw error;
    }
  }

  private getFreshCsrfToken(): string {
    const cookieName = 'XSRF-TOKEN=';
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const trimmedCookie = cookie.trim();
      if (trimmedCookie.startsWith(cookieName)) {
        return decodeURIComponent(trimmedCookie.substring(cookieName.length));
      }
    }
    return '';
  }

  public async deleteUser(userId: number): Promise<any> {
    await this.ensureCsrfToken();
    const options = await this.getAuthenticatedRequestOptions();
    
    return this.http.delete(
        `${this.API_URL}/users/${userId}`,
        options
    ).toPromise();
  }

  public getCsrfToken(): string {
    return this.csrfToken || this.getFreshCsrfToken();
  }

  async register(userData: any): Promise<any> {
    await this.ensureCsrfToken();
  
    try {
      const registrationData = {
        name: userData.name,
        username: userData.username,
        email: userData.email || null,
        password: userData.password,
        password_confirmation: userData.password_confirmation || userData.confirmPassword,
        role: userData.role
      };
  
      const response = await this.http.post<any>(
        `${this.API_URL}/register`,
        registrationData,
        {
          withCredentials: true,
          headers: this.getBasicHeaders()
        }
      ).toPromise();
  
      return response;
  
    } catch (error: any) {
      console.error('Erro no registro:', error);
      throw this.handleAuthError(error);
    }
  }

  public async login(username: string, password: string): Promise<any> {
    try {
      await this.ensureCsrfToken();

      const response = await this.http.post<any>(
        `${this.API_URL}/login`,
        { username, password },
        {
          withCredentials: true,
          headers: this.getBasicHeaders()
        }
      ).toPromise();

      if (response?.token && response?.user) {
        this.storeAuthData(response.token, response.user);
        this.setAuthStatus(true);
        this.redirectBasedOnRole(response.user.role);
        
        if (response.user.photo) {
          this.setUserPhoto(response.user.photo);
        }
        
        return response;
      }
      throw new Error('Formato de resposta inválido do servidor.');
    } catch (error) {
      console.error('Erro no login:', error);
      throw this.handleAuthError(error);
    }
  }

  public async logout(): Promise<void> {
    const token = this.getToken();
    
    try {
      if (token) {
        const options = await this.getAuthenticatedRequestOptions();
        await this.http.post(
          `${this.API_URL}/logout`,
          {},
          options
        ).toPromise();
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      this.clearAuthData();
      this.router.navigate(['/login']);
    }
  }

  public storeAuthData(token: string, user: any): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem('user_role', user.role || 'user');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user_id', user.id.toString());
    
    if (user.photo) {
      this.setUserPhoto(user.photo);
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('user_role');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
    localStorage.removeItem('userPhotoUrl');
    localStorage.removeItem('userPhotoPath');
    this.csrfToken = null;
    this.setAuthStatus(false);
  }

  public hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  public isAdmin(): boolean {
    return this.hasRole('admin');
  }

  public isEmployee(): boolean {
    return this.hasRole('employee');
  }

  public canDeleteUsers(): boolean {
    return this.isAdmin();
  }

  public canEditUsers(): boolean {
    return this.isAdmin() || this.isEmployee(); 
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  public getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  public getUserId(): number | null {
    const id = localStorage.getItem('user_id');
    return id ? parseInt(id) : null;
  }

  public getUserPhotoUrl(): string {
    return localStorage.getItem('userPhotoUrl') || 'assets/img/default-user.png';
  }

  private redirectBasedOnRole(role: string): void {
    const targetRoute = role === 'admin' || role === 'employee' 
      ? '/appointments-list' 
      : '/home';
    this.router.navigate([targetRoute]);
  }

  private setAuthStatus(status: boolean): void {
    this.authStatusListener.next(status);
  }

  public initializeAuthState(): void {
    if (this.isLoggedIn()) {
      this.setAuthStatus(true);
      this.refreshUserData();
    } else {
      this.setAuthStatus(false);
    }
  }

  public setUserPhoto(photoPath: string): void {
    const cleanPath = photoPath.replace(/^photos\//, '');
    const photoUrl = photoPath.startsWith('http') 
      ? photoPath 
      : `${this.photoBaseUrl}${cleanPath}?t=${Date.now()}`;
    
    this.testImageLoad(photoUrl).then(isValid => {
      if (isValid) {
        localStorage.setItem('userPhotoUrl', photoUrl);
        localStorage.setItem('userPhotoPath', cleanPath);
        this.authStatusListener.next(true);
      } else {
        console.error('Falha ao carregar imagem:', photoUrl);
        this.setDefaultPhoto();
      }
    });
  }

  private async testImageLoad(url: string): Promise<boolean> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  private setDefaultPhoto(): void {
    const defaultPhoto = 'assets/img/default-user.png';
    localStorage.setItem('userPhotoUrl', defaultPhoto);
    localStorage.removeItem('userPhotoPath');
    this.authStatusListener.next(true);
  }

  public processPhotoUrl(url: string): string {
    if (!url || url.includes('default-user.png')) {
      return url;
    }
    
    const cleanUrl = url.replace(/^.*\/storage\/photos\//, '');
    
    if (cleanUrl.startsWith('http')) {
      return `${cleanUrl.split('?')[0]}?t=${Date.now()}`;
    }
    
    if (!cleanUrl.includes('/')) {
      return `${this.photoBaseUrl}${cleanUrl.split('?')[0]}?t=${Date.now()}`;
    }
    
    return 'assets/img/default-user.png';
  }

  private getBasicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-XSRF-TOKEN': this.getCsrfToken()
    });
  }

  public async getAuthenticatedRequestOptions(): Promise<{
    headers: HttpHeaders,
    withCredentials: boolean
  }> {
    await this.ensureCsrfToken();
    return {
      headers: this.getAuthHeaders(),
      withCredentials: true
    };
  }

  public getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-XSRF-TOKEN': this.getCsrfToken()
    });
  }

  private handleAuthError(error: any): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return new Error('Credenciais inválidas');
      } else if (error.status === 403) {
        return new Error('Você não tem permissão para esta ação');
      } else if (error.status === 422 && error.error?.errors) {
        const firstError = Object.values(error.error.errors)[0];
        return new Error(Array.isArray(firstError) ? firstError[0] : 'Erro de validação');
      }
    }
    return new Error(error.message || 'Ocorreu um erro desconhecido');
  }

  public async refreshUserData(): Promise<void> {
    const token = this.getToken();
    const userId = this.getUserId();
    
    if (token && userId) {
      try {
        const options = await this.getAuthenticatedRequestOptions();
        const updatedUser = await this.http.get<any>(
          `${this.API_URL}/users/${userId}`,
          options
        ).toPromise();

        this.storeAuthData(token, updatedUser);
      } catch (error) {
        console.error('Falha ao atualizar dados do usuário:', error);
        await this.logout();
      }
    }
  }

  public async uploadUserPhoto(userId: number, photo: File): Promise<{photoUrl: string, photoPath: string}> {
    await this.ensureCsrfToken();

    const formData = new FormData();
    formData.append('photo', photo);

    const options = await this.getAuthenticatedRequestOptions();
    const headers = options.headers.delete('Content-Type'); 

    try {
      const response = await this.http.post<{
        photo: string, 
        photo_url: string,
        user: any
      }>(
        `${this.API_URL}/users/${userId}/upload-photo`,
        formData,
        {
          headers: headers,
          withCredentials: true
        }
      ).toPromise();

      if (!response) {
        throw new Error('Nenhuma resposta do servidor');
      }

      const currentUser = this.getUser();
      currentUser.photo = response.photo;
      this.storeAuthData(this.getToken() || '', currentUser);
      
      return {
        photoUrl: response.photo_url,
        photoPath: response.photo
      };
    } catch (error) {
      console.error('Erro no upload:', error);
      throw this.handleAuthError(error);
    }
  }
}