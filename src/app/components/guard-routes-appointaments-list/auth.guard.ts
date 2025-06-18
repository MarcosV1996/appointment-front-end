import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    const userRole = this.authService.getUserRole();
    const expectedRoles = route.data['expectedRoles'] as Array<string>;
    
    console.log('AuthGuard checking:');
    console.log('- isLoggedIn:', isLoggedIn);
    console.log('- userRole:', userRole);
    console.log('- expectedRoles:', expectedRoles);
  
    if (!isLoggedIn) {
      console.log('AuthGuard: User not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }
  
    if (expectedRoles && userRole && !expectedRoles.includes(userRole)) {
      console.log('AuthGuard: User role not authorized, redirecting to home');
      this.router.navigate(['/home']);
      return false;
    }
  
    console.log('AuthGuard: Access granted');
    return true;
  }
}